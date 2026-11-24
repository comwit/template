import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFile } from 'node:fs/promises'
import { transform } from 'esbuild'

const source = await readFile(new URL('../../src/lib/service-worker/cache-policy.ts', import.meta.url), 'utf8')
const { code } = await transform(source, { loader: 'ts', format: 'esm' })
const policy = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)
const sw = await readFile(new URL('../../src/app/sw.ts', import.meta.url), 'utf8')
const nextConfig = await readFile(new URL('../../next.config.ts', import.meta.url), 'utf8')

const ORIGIN = 'https://app.test'

/**
 * A deployment as the worker sees it: each request lands in (cache, key) by the policy, and
 * activation deletes the caches `outdatedCacheNames` names. `files` maps a path to its content.
 */
function deploy(cache, version, files) {
  const namespace = `comwit-${version}`
  for (const name of policy.outdatedCacheNames([...cache.keys()], namespace)) cache.delete(name)
  const read = (path, destination = 'script') => {
    const url = new URL(path, ORIGIN)
    url.searchParams.set('dpl', version)
    const kind = policy.assetKind(url, destination)
    assert.ok(kind, `${path} is a static asset`)
    const cacheName = policy.assetCacheName(kind, namespace)
    const key = policy.DEPLOYMENT_FREE_KEY_KINDS.includes(kind) ? policy.withoutDeploymentQuery(url) : url.href
    if (!cache.has(cacheName)) cache.set(cacheName, new Map())
    const entries = cache.get(cacheName)
    // Cache-first for hashed and build files: a hit is answered without the network.
    if (kind === 'hashed' || kind === 'build') {
      if (!entries.has(key)) entries.set(key, files[path])
      return entries.get(key)
    }
    // Code is network-first and media is refreshed in the background: the next read is current.
    entries.set(key, files[path])
    return files[path]
  }
  return read
}

test('build-id files keep their path across builds but never answer a new deployment with old content', () => {
  const cache = new Map()
  const manifest = '/_next/static/build-TfctsWXpff2fKS/_buildManifest.js'
  const ssg = '/_next/static/build-TfctsWXpff2fKS/_ssgManifest.js'
  let read = deploy(cache, 'v1', { [manifest]: 'routes v1', [ssg]: 'ssg v1' })
  assert.equal(read(manifest), 'routes v1')
  assert.equal(read(ssg), 'ssg v1')
  read = deploy(cache, 'v2', { [manifest]: 'routes v2', [ssg]: 'ssg v2' })
  assert.equal(read(manifest), 'routes v2')
  assert.equal(read(ssg), 'ssg v2')
  assert.equal(cache.has('comwit-v1-build'), false, 'the previous deployment cache is deleted on activation')
})

test('an unchanged hashed chunk or font is reused; a changed one arrives under a new name', () => {
  const cache = new Map()
  const font = '/_next/static/media/f1b2c3-s.p.0ztvx5mb7lxp4.woff2'
  let read = deploy(cache, 'v1', { '/_next/static/chunks/0abc.js': 'app v1', [font]: 'font' })
  read('/_next/static/chunks/0abc.js')
  read(font, 'font')
  read = deploy(cache, 'v2', { '/_next/static/chunks/1def.js': 'app v2', [font]: 'font' })
  assert.equal(read('/_next/static/chunks/1def.js'), 'app v2')
  assert.equal(read(font, 'font'), 'font')
  assert.equal(cache.get(policy.STATIC_CACHE).size, 3, 'the font entry was reused, not stored again')
})

test('unhashed scripts and styles always follow the deployment', () => {
  const cache = new Map()
  let read = deploy(cache, 'v1', { '/vendor/widget.js': 'widget v1', '/theme.css': 'theme v1' })
  read('/vendor/widget.js')
  read('/theme.css', 'style')
  read = deploy(cache, 'v2', { '/vendor/widget.js': 'widget v2', '/theme.css': 'theme v2' })
  assert.equal(read('/vendor/widget.js'), 'widget v2')
  assert.equal(read('/theme.css', 'style'), 'theme v2')
})

test('asset kinds', () => {
  const kind = (path, destination = '') => policy.assetKind(new URL(path, ORIGIN), destination)
  assert.equal(kind('/_next/static/chunks/abc.js?dpl=v1'), 'hashed')
  assert.equal(kind('/_next/static/chunks/abc.css'), 'hashed')
  assert.equal(kind('/_next/static/media/f.woff2', 'font'), 'hashed')
  assert.equal(kind('/_next/static/build-TfctsWXpff2fKS/_buildManifest.js'), 'build')
  assert.equal(kind('/_next/static/build-TfctsWXpff2fKS/_clientMiddlewareManifest.js'), 'build')
  assert.equal(kind('/vendor/widget.js'), 'code')
  assert.equal(kind('/manifest.webmanifest', 'manifest'), 'code')
  assert.equal(kind('/icon-192.png', 'image'), 'media')
  assert.equal(kind('/_next/image?url=%2Fa.png&w=64&q=75', 'image'), 'media')
  assert.equal(kind('/fonts/local.woff2', 'font'), 'media')
  assert.equal(kind('/m/today', 'document'), null)
})

test('a deployment removes only older deployment caches and caches of older workers', () => {
  const names = [
    'comwit-v1-documents', 'comwit-v1-static-rsc', 'comwit-v1-build', 'comwit-v1-code',
    'comwit-v1-assets', 'comwit-v1-precache',
    'comwit-v2-documents', 'comwit-v2-dynamic-rsc',
    ...policy.PERSISTENT_CACHE_NAMES,
    'other-app-cache',
  ]
  assert.deepEqual(policy.outdatedCacheNames(names, 'comwit-v2'), [
    'comwit-v1-documents', 'comwit-v1-static-rsc', 'comwit-v1-build', 'comwit-v1-code',
    'comwit-v1-assets', 'comwit-v1-precache',
  ])
})

test('the cache key drops only the deployment query', () => {
  assert.equal(
    policy.withoutDeploymentQuery(new URL('/_next/static/media/f.woff2?dpl=v1', ORIGIN)),
    `${ORIGIN}/_next/static/media/f.woff2`,
  )
  assert.equal(
    policy.withoutDeploymentQuery(new URL('/_next/image?url=%2Fa.png&w=64&dpl=v2', ORIGIN)),
    `${ORIGIN}/_next/image?url=%2Fa.png&w=64`,
  )
})

test('the worker wires the policy: deployment ids, key plugin, never-cached worker files', () => {
  // Build-id files rely on Next's ?dpl= query, which needs a deployment id.
  assert.match(nextConfig, /deploymentId:/)
  for (const kind of ['hashed', 'build', 'code', 'media']) {
    assert.match(sw, new RegExp(`cacheName: assetCacheName\\("${kind}", CACHE_NAMESPACE\\)`))
  }
  const block = (name) => sw.slice(sw.indexOf(`const ${name} =`), sw.indexOf('});', sw.indexOf(`const ${name} =`)))
  assert.match(block('immutableAssets'), /deploymentFreeKey/)
  assert.match(block('mediaAssets'), /deploymentFreeKey/)
  assert.doesNotMatch(block('buildAssets'), /deploymentFreeKey/)
  assert.doesNotMatch(block('codeAssets'), /deploymentFreeKey/)
  const versioned = [...sw.matchAll(/cacheName: `\$\{CACHE_NAMESPACE\}-([a-z-]+)`/g)].map((match) => match[1]).sort()
  assert.deepEqual(versioned, ['documents', 'dynamic-rsc', 'static-rsc'])
  // /sw.js and /version.json are matched by the network-only rule before any cache rule.
  const networkOnly = sw.indexOf('url.pathname === "/sw.js"')
  assert.ok(networkOnly > 0 && networkOnly < sw.indexOf('handler: immutableAssets'))
  assert.match(sw, /outdatedCacheNames\(cacheNames, CACHE_NAMESPACE\)/)
})
