import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import * as fs from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'

const require = createRequire(import.meta.url)
const adapterDir = dirname(require.resolve('@brrrd/adapter'))
const { createNextBuildModel } = await import(pathToFileURL(join(adapterDir, 'model.js')).href)
const { createManifestSupplement } = await import(pathToFileURL(join(adapterDir, 'manifest-supplement.js')).href)
const { createArtifactPlan, executeArtifactPlan } = await import(pathToFileURL(join(adapterDir, 'artifact-planner.js')).href)
const { compileRouteTable } = await import(pathToFileURL(join(adapterDir, 'routing-compiler.js')).href)
const { default: CacheHandler } = await import(pathToFileURL(require.resolve('@brrrd/adapter/cache-handler-legacy')).href)
const { getRouteCacheKey } = require('next/dist/server/lib/route-cache-key')
const directories = []
const originalDeno = Object.getOwnPropertyDescriptor(globalThis, 'Deno')

function fixture() {
  const projectDir = mkdtempSync(join(tmpdir(), 'template-route-cache-'))
  directories.push(projectDir)
  const distDir = join(projectDir, '.next')
  const serverDir = join(distDir, 'server')
  mkdirSync(serverDir, { recursive: true })
  return { projectDir, distDir, serverDir }
}

function write(filePath, value) {
  mkdirSync(dirname(filePath), { recursive: true })
  writeFileSync(filePath, value)
}

function seedPage(serverDir, key, html) {
  write(join(serverDir, `${key}.html`), html)
  write(join(serverDir, `${key}.rsc`), '0:["seed"]')
  write(join(serverDir, `${key}.meta`), JSON.stringify({ status: 200, headers: { 'x-seed': 'yes' } }))
}

function runtimeCacheMiss() {
  Object.defineProperty(globalThis, 'Deno', { configurable: true, value: { core: { ops: {
    op_brrrd_cache_get: async () => null,
    op_brrrd_cache_set: async () => {},
    op_brrrd_cache_revalidate_tag: async () => {},
  } } } })
}

afterEach(() => {
  if (originalDeno) Object.defineProperty(globalThis, 'Deno', originalDeno)
  else delete globalThis.Deno
  for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true })
})

test('packages declared HTML, RSC, segments and runtime seeds using public route metadata', () => {
  const { projectDir, distDir, serverDir } = fixture()
  const key = getRouteCacheKey('/_global-error', { kind: 'APP_PAGE', sourceRoute: '/_global-error/page' })
  const htmlPath = join(serverDir, `${key}.html`)
  const rscPath = join(serverDir, `${key}.rsc`)
  const segmentPath = join(serverDir, `${key}.segments/_tree.segment.rsc`)
  seedPage(serverDir, key, '<html>error document</html>')
  write(segmentPath, '0:["segment"]')
  const owner = { id: '/_global-error', pathname: '/_global-error', sourcePage: '/_global-error/page', config: {} }
  const outputs = [
    { pathname: '/_global-error', filePath: htmlPath, contentType: 'text/html; charset=utf-8' },
    { pathname: '/_global-error.rsc', filePath: rscPath, contentType: 'text/x-component' },
    { pathname: '/_global-error.segments/_tree.segment.rsc', filePath: segmentPath, contentType: 'text/x-component' },
  ]
  const model = createNextBuildModel({ projectDir, repoRoot: projectDir, distDir, config: {}, nextVersion: '16.4.3', buildId: 'fixture', outputs: {
    pages: [], pagesApi: [], appPages: [owner], appRoutes: [], staticFiles: [],
    prerenders: outputs.map(output => ({ id: output.pathname, pathname: output.pathname, parentOutputId: owner.id, config: {}, fallback: { filePath: output.filePath, initialHeaders: { 'content-type': output.contentType, 'cache-control': 'public, max-age=60' } } })),
  } })
  assert.deepEqual(model.outputs.prerenders.map(output => output.filePath), outputs.map(output => output.filePath))
  const supplement = createManifestSupplement(distDir, model.outputs.prerenders)
  const outDir = join(projectDir, 'package')
  executeArtifactPlan(createArtifactPlan(model, supplement, new Map(), outDir, { hasAppBundle: false }), outDir)
  assert.equal(readFileSync(join(outDir, 'static/_global-error'), 'utf8'), '<html>error document</html>')
  assert.equal(readFileSync(join(outDir, 'static/_global-error.rsc'), 'utf8'), '0:["seed"]')
  assert.equal(readFileSync(join(outDir, 'static/_global-error.segments/_tree.segment.rsc'), 'utf8'), '0:["segment"]')
  assert.deepEqual(JSON.parse(readFileSync(join(outDir, 'runtime/.next/server', `${key}.meta`), 'utf8')).headers, { 'x-seed': 'yes' })
  const route = compileRouteTable(model, supplement).find(entry => entry.file === '/_global-error.rsc')
  assert.equal(route.type, 'static')
  assert.ok(route.headers.some(header => header.key === 'content-type' && header.value === 'text/x-component'))
})

test('prefers explicit paths and excludes RSC outputs without seeds', () => {
  const { projectDir, distDir } = fixture()
  const model = createNextBuildModel({ projectDir, repoRoot: projectDir, distDir, config: {}, outputs: {
    pages: [], pagesApi: [], appPages: [], appRoutes: [], staticFiles: [], prerenders: [
      { id: 'explicit', pathname: '/explicit.rsc', filePath: '/actual.rsc', fallback: { filePath: '/fallback.rsc' } },
      { id: 'dynamic', pathname: '/dynamic.rsc', fallback: {} },
    ],
  } })
  assert.deepEqual(createManifestSupplement(distDir, model.outputs.prerenders).appPrerenderDataRoutes, [
    { pathname: '/explicit.rsc', filePath: '/actual.rsc', sourceRel: 'explicit.rsc' },
  ])
})

test('reads cold scoped HTML/RSC seeds and preserves legacy paths', async () => {
  const { serverDir } = fixture()
  const key = getRouteCacheKey('/about', { kind: 'APP_PAGE', sourceRoute: '/(site)/about/page' })
  seedPage(serverDir, key, '<html>about</html>')
  seedPage(join(serverDir, 'app'), '/legacy', '<html>legacy</html>')
  runtimeCacheMiss()
  const cache = new CacheHandler({ serverDistDir: serverDir })
  const entry = await cache.get(key, { kind: 'APP_PAGE' })
  assert.equal(entry.value.html, '<html>about</html>')
  assert.deepEqual(entry.value.rscData, Buffer.from('0:["seed"]'))
  assert.equal(entry.value.status, 200)
  assert.deepEqual(entry.value.headers, { 'x-seed': 'yes' })
  assert.equal((await cache.get('/legacy', { kind: 'APP_PAGE' })).value.html, '<html>legacy</html>')
})

test('preserves PPR segments and postponed state without full RSC for a shell', async () => {
  const { serverDir } = fixture()
  const key = getRouteCacheKey('/lounge', { kind: 'APP_PAGE', sourceRoute: '/(app)/lounge/page' })
  seedPage(serverDir, key, '<html>shell</html>')
  write(join(serverDir, `${key}.meta`), JSON.stringify({ postponed: 'resume-state', segmentPaths: ['/_tree'] }))
  write(join(serverDir, `${key}.segments/_tree.segment.rsc`), '0:["tree"]')
  runtimeCacheMiss()
  const entry = await new CacheHandler({ serverDistDir: serverDir }).get(key, { kind: 'APP_PAGE', isRoutePPREnabled: true })
  assert.equal(entry.value.postponed, 'resume-state')
  assert.equal(entry.value.rscData, undefined)
  assert.deepEqual(entry.value.segmentData, new Map([['/_tree', Buffer.from('0:["tree"]')]]))
})

test('isolates dynamic fallback seeds by source route owner', async () => {
  const { serverDir } = fixture()
  const owner = { kind: 'APP_PAGE', sourceRoute: '/(app)/posts/[id]/page' }
  seedPage(serverDir, getRouteCacheKey('/posts/[id]', owner), '<html>post shell</html>')
  runtimeCacheMiss()
  const cache = new CacheHandler({ serverDistDir: serverDir })
  assert.equal((await cache.get(getRouteCacheKey('/posts/123', owner), { kind: 'APP_PAGE' })).value.html, '<html>post shell</html>')
  assert.equal(await cache.get(getRouteCacheKey('/posts/123', { ...owner, sourceRoute: '/(other)/posts/[id]/page' }), { kind: 'APP_PAGE' }), null)
})

test('reads and writes scoped disk seeds outside brrrd', async () => {
  const { serverDir } = fixture()
  const key = getRouteCacheKey('/disk', { kind: 'APP_PAGE', sourceRoute: serverDir })
  seedPage(serverDir, key, '<html>cold disk</html>')
  const cacheFs = { ...fs, mkdir: filePath => fs.mkdir(filePath, { recursive: true }) }
  const cache = new CacheHandler({ serverDistDir: serverDir, fs: cacheFs, flushToDisk: true })
  assert.equal((await cache.get(key, { kind: 'APP_PAGE' })).value.html, '<html>cold disk</html>')
  await cache.set(key, { kind: 'APP_PAGE', html: '<html>updated</html>', rscData: Buffer.from('0:["updated"]'), headers: {}, status: 200 }, {})
  assert.equal(readFileSync(join(serverDir, `${key}.html`), 'utf8'), '<html>updated</html>')
  assert.equal(readFileSync(join(serverDir, `${key}.rsc`), 'utf8'), '0:["updated"]')
})
