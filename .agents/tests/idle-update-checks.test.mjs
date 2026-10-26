import assert from 'node:assert/strict'
import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'
import { createAppVersion, readAppVersion } from '../../scripts/app-version.mjs'

const transpile = async (path) => ts.transpileModule(await readFile(new URL(path, import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText
const source = await transpile('../../src/lib/service-worker/updates.ts')
const activateSource = await transpile('../../src/lib/service-worker/activate-update.ts')

function mount({ controlled = true, waiting = null, visibility = 'visible', update = async () => {} } = {}) {
  const notices = []
  let checks = 0
  let reloads = 0
  const registration = Object.assign(new EventTarget(), {
    waiting, installing: null,
    update: async () => { checks++; await update() },
  })
  const serviceWorker = Object.assign(new EventTarget(), { controller: controlled ? {} : null })
  const window = Object.assign(new EventTarget(), {
    location: { reload: () => { reloads++ } },
    setTimeout: (...args) => globalThis.setTimeout(...args),
    clearTimeout: (...args) => globalThis.clearTimeout(...args),
  })
  const document = Object.assign(new EventTarget(), { visibilityState: visibility })
  const navigator = { serviceWorker, onLine: true }
  const context = vm.createContext({ exports: {}, window, document, navigator, MessageChannel })
  vm.runInContext(source, context)
  const stopObserving = context.exports.observeControllerChanges()
  const stopUpdates = context.exports.setupServiceWorkerUpdates(registration, (apply, status) => notices.push({ apply, status }))
  return {
    window, document, navigator, registration, serviceWorker, notices,
    get checks() { return checks }, get reloads() { return reloads },
    unmount() { stopObserving(); stopUpdates() },
  }
}
const settle = () => new Promise(setImmediate)
const changeController = (app) => { app.serviceWorker.controller = {}; app.serviceWorker.dispatchEvent(new Event('controllerchange')) }

function worker(result = 'activating') {
  const messages = []
  return Object.assign(new EventTarget(), {
    state: 'installing', messages,
    postMessage(message, ports) { messages.push(message); ports[0].postMessage(result) },
  })
}

test('waiting worker requires acceptance and reload happens only after control changes', async () => {
  const waiting = worker()
  const app = mount({ waiting })
  assert.equal(app.notices[0].status, 'ready')
  assert.equal(waiting.messages.length, 0)
  await app.notices[0].apply()
  assert.equal(waiting.messages[0].type, 'COMWIT_APPLY_UPDATE')
  assert.equal(app.reloads, 0)
  changeController(app)
  changeController(app)
  assert.equal(app.reloads, 1)
  app.unmount()
})

test('first install does not prompt or reload; a later externally activated update reloads once', () => {
  const app = mount({ controlled: false })
  const installing = worker()
  app.registration.installing = installing
  app.registration.dispatchEvent(new Event('updatefound'))
  installing.state = 'installed'
  installing.dispatchEvent(new Event('statechange'))
  changeController(app)
  assert.equal(app.notices.length, 0)
  assert.equal(app.reloads, 0)
  changeController(app)
  assert.equal(app.reloads, 1)
  app.unmount()
})

test('newly installed update is announced once without promotion', () => {
  const app = mount()
  const installing = worker()
  app.registration.installing = installing
  app.registration.dispatchEvent(new Event('updatefound'))
  app.registration.waiting = installing
  installing.state = 'installed'
  installing.dispatchEvent(new Event('statechange'))
  assert.equal(app.notices.length, 1)
  assert.equal(installing.messages.length, 0)
  app.unmount()
})

test('one hour idle never checks; foreground and online events check with in-flight deduplication', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] })
  const app = mount()
  t.mock.timers.tick(3_600_000)
  await settle()
  assert.equal(app.checks, 0)
  app.window.dispatchEvent(new Event('focus'))
  app.document.dispatchEvent(new Event('visibilitychange'))
  assert.equal(app.checks, 1)
  await settle()
  app.document.visibilityState = 'hidden'
  app.window.dispatchEvent(new Event('online'))
  assert.equal(app.checks, 1)
  app.document.visibilityState = 'visible'
  app.document.dispatchEvent(new Event('visibilitychange'))
  await settle()
  app.window.dispatchEvent(new Event('online'))
  await settle()
  assert.equal(app.checks, 3)
  app.unmount()
  app.window.dispatchEvent(new Event('focus'))
  assert.equal(app.checks, 3)
})

test('offline checks and failed updates never reload or retry on their own', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] })
  const app = mount({ update: async () => { throw new Error('offline') } })
  app.navigator.onLine = false
  app.window.dispatchEvent(new Event('focus'))
  assert.equal(app.checks, 0)
  app.navigator.onLine = true
  app.window.dispatchEvent(new Event('online'))
  await settle()
  t.mock.timers.tick(3_600_000)
  await settle()
  assert.equal(app.checks, 1)
  assert.equal(app.reloads, 0)
  app.unmount()
})

test('blocked activation remains retryable and never reloads', async () => {
  const app = mount({ waiting: worker('blocked') })
  await app.notices[0].apply()
  assert.equal(app.notices.at(-1).status, 'blocked')
  assert.equal(app.reloads, 0)
  app.registration.waiting = worker()
  await app.notices.at(-1).apply()
  assert.equal(app.registration.waiting.messages.length, 1)
  app.unmount()
})

test('an unresponsive worker times out without discarding the running app', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const app = mount({ waiting: { postMessage() {} } })
  const pending = app.notices[0].apply()
  t.mock.timers.tick(5000)
  await pending
  assert.equal(app.notices.at(-1).status, 'failed')
  assert.equal(app.reloads, 0)
  app.unmount()
})

test('unmount removes installation and controller listeners and cancels pending messages', async () => {
  const app = mount({ waiting: { postMessage() {} } })
  const pending = app.notices[0].apply()
  app.unmount()
  await pending
  changeController(app)
  assert.equal(app.reloads, 0)
  assert.equal(app.notices.length, 1)
})

test('activation is deferred for another scoped client, including uncontrolled windows', async () => {
  const context = vm.createContext({ exports: {} })
  vm.runInContext(activateSource, context)
  let activations = 0
  let clients = [{ id: 'requester', url: 'https://app.test/' }, { id: 'other', url: 'https://app.test/form' }]
  const scope = {
    registration: { scope: 'https://app.test/' },
    clients: { matchAll: async (options) => { assert.equal(options.includeUncontrolled, true); return clients } },
    skipWaiting: async () => { activations++ },
  }
  assert.equal(await context.exports.activateUpdate(scope, 'requester'), 'blocked')
  assert.equal(activations, 0)
  clients = clients.slice(0, 1)
  assert.equal(await context.exports.activateUpdate(scope, 'wrong-client'), 'blocked')
  assert.equal(await context.exports.activateUpdate(scope, 'requester'), 'activating')
  assert.equal(activations, 1)
})

test('rebuilds get unique IDs even at the same commit; explicit artifact IDs are shared', async () => {
  assert.notEqual(createAppVersion({ GIT_SHA: 'same' }), createAppVersion({ GIT_SHA: 'same' }))
  assert.equal(createAppVersion({ NEXT_DEPLOYMENT_ID: ' release-42 ', DEPLOYMENT_VERSION: 'other' }), 'release-42')
  assert.equal(createAppVersion({ DEPLOYMENT_VERSION: 'release-42' }), 'release-42')
  const dir = await mkdtemp(join(tmpdir(), 'comwit-version-'))
  try {
    const file = join(dir, 'version.json')
    await writeFile(file, JSON.stringify({ version: createAppVersion({}) }))
    const a = readAppVersion({ development: false, file })
    assert.equal(readAppVersion({ development: false, file }), a)
    assert.equal(readAppVersion({ development: true, file }), 'development')
    await writeFile(file, '{}')
    assert.throws(() => readAppVersion({ development: false, file }), /Missing deployment version/)
  } finally { await rm(dir, { recursive: true, force: true }) }
})
