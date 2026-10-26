import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'

const sources = await Promise.all(['service-worker-register', 'app-version-guard'].map(async (name) => {
  const source = await readFile(new URL(`../../src/lib/components/${name}.tsx`, import.meta.url), 'utf8')
  return ts.transpileModule(source.replace('import { useEffect } from "react";', ''), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
}))

function mount({ version = 'current', readyState = 'complete', visibilityState = 'visible', waiting = null, installing = null, offline = false } = {}) {
  const requests = []
  const cleanups = []
  const storage = new Map()
  let reloads = 0
  const registration = Object.assign(new EventTarget(), {
    waiting, installing,
    update: async () => { requests.push('/sw.js (update)') },
  })
  const serviceWorker = Object.assign(new EventTarget(), {
    controller: {},
    register: async (url) => { requests.push(url); return registration },
  })
  const window = Object.assign(new EventTarget(), { location: { reload: () => { reloads++ } } })
  window.parent = window
  const document = Object.assign(new EventTarget(), { visibilityState, readyState })
  const context = vm.createContext({
    exports: {}, window, document, navigator: { serviceWorker },
    process: { env: { NODE_ENV: 'production', NEXT_PUBLIC_COMWIT_APP_VERSION: 'current' } },
    useEffect: (effect) => cleanups.push(effect()),
    setInterval: (...args) => globalThis.setInterval(...args),
    setTimeout: (...args) => globalThis.setTimeout(...args),
    clearInterval: (...args) => globalThis.clearInterval(...args),
    clearTimeout: (...args) => globalThis.clearTimeout(...args),
    fetch: async (url) => {
      requests.push(url.split('?')[0])
      if (offline) throw new TypeError('Failed to fetch')
      return { ok: true, json: async () => ({ version }) }
    },
    sessionStorage: { getItem: (key) => storage.get(key), setItem: (key, value) => storage.set(key, value) },
  })
  for (const source of sources) vm.runInContext(source, context)
  context.exports.ServiceWorkerRegister()
  context.exports.AppVersionGuard()
  return {
    requests, window, document, registration, serviceWorker,
    get reloads() { return reloads },
    unmount: () => cleanups.forEach((cleanup) => cleanup?.()),
  }
}

const settle = () => new Promise(setImmediate)

test('idle time and repeated tab focus do not issue additional update requests', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] })
  const app = mount()
  await settle()
  for (let minute = 0; minute < 60; minute++) {
    t.mock.timers.tick(60_000)
    await settle()
  }
  for (let visit = 0; visit < 5; visit++) {
    app.document.visibilityState = 'hidden'
    app.document.dispatchEvent(new Event('visibilitychange'))
    app.document.visibilityState = 'visible'
    app.document.dispatchEvent(new Event('visibilitychange'))
    app.window.dispatchEvent(new Event('focus'))
    await settle()
  }
  assert.deepEqual(app.requests, ['/sw.js', '/version.json'])
  assert.equal(app.reloads, 0)
  app.unmount()
})

test('a newly discovered worker still activates and reloads only once', async () => {
  const app = mount()
  await settle()
  const messages = []
  const worker = Object.assign(new EventTarget(), {
    state: 'installing', postMessage: (message) => messages.push(message),
  })
  app.registration.installing = worker
  app.registration.dispatchEvent(new Event('updatefound'))
  app.registration.waiting = worker
  worker.state = 'installed'
  worker.dispatchEvent(new Event('statechange'))
  assert.deepEqual(messages, ['skip-waiting'])
  app.serviceWorker.dispatchEvent(new Event('controllerchange'))
  app.serviceWorker.dispatchEvent(new Event('controllerchange'))
  assert.equal(app.reloads, 1)
  app.unmount()
})

test('an already waiting worker is promoted on registration', async () => {
  const messages = []
  const app = mount({ waiting: { postMessage: (message) => messages.push(message) } })
  await settle()
  assert.deepEqual(messages, ['skip-waiting'])
  app.serviceWorker.dispatchEvent(new Event('controllerchange'))
  assert.equal(app.reloads, 1)
  app.unmount()
})

test('the initial version check still reloads an old document', async () => {
  const app = mount({ version: 'new-deployment' })
  await settle()
  assert.equal(app.reloads, 1)
  app.unmount()
})

test('unmount before load prevents late registration', async () => {
  const app = mount({ readyState: 'loading' })
  await settle()
  app.unmount()
  app.window.dispatchEvent(new Event('load'))
  await settle()
  assert.deepEqual(app.requests, ['/version.json'])
})

test('a background document checks once and does not recheck on visibility', async () => {
  const app = mount({ visibilityState: 'hidden' })
  await settle()
  app.document.visibilityState = 'visible'
  app.document.dispatchEvent(new Event('visibilitychange'))
  await settle()
  assert.deepEqual(app.requests, ['/sw.js', '/version.json'])
  app.unmount()
})

test('failed version requests do not retry while idle or on focus', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] })
  const app = mount({ offline: true })
  await settle()
  for (let second = 0; second < 60; second += 2) {
    t.mock.timers.tick(2000)
    app.window.dispatchEvent(new Event('focus'))
    await settle()
  }
  assert.deepEqual(app.requests, ['/sw.js', '/version.json'])
  assert.equal(app.reloads, 0)
  app.unmount()
})
