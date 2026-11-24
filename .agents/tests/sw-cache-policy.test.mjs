import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFile } from 'node:fs/promises'
import { transform } from 'esbuild'

const source = await readFile(new URL('../../src/lib/service-worker/cache-policy.ts', import.meta.url), 'utf8')
const { code } = await transform(source, { loader: 'ts', format: 'esm' })
const policy = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)
const sw = await readFile(new URL('../../src/app/sw.ts', import.meta.url), 'utf8')

test('a deployment removes only older deployment caches and caches of older workers', () => {
  const namespace = 'comwit-v2'
  const names = [
    'comwit-v1-documents', 'comwit-v1-static-rsc', 'comwit-v1-assets', 'comwit-v1-precache',
    'comwit-v2-documents', 'comwit-v2-dynamic-rsc',
    ...policy.PERSISTENT_CACHE_NAMES,
    'other-app-cache',
  ]
  assert.deepEqual(policy.outdatedCacheNames(names, namespace), [
    'comwit-v1-documents', 'comwit-v1-static-rsc', 'comwit-v1-assets', 'comwit-v1-precache',
  ])
})

test('hashed build output, fonts included, is immutable; public files are not', () => {
  assert.equal(policy.isImmutableAsset(new URL('https://a.test/_next/static/chunks/abc.js?dpl=v1')), true)
  assert.equal(policy.isImmutableAsset(new URL('https://a.test/_next/static/media/f1b2.p.woff2')), true)
  assert.equal(policy.isImmutableAsset(new URL('https://a.test/icon-192.png')), false)
  assert.equal(policy.isImmutableAsset(new URL('https://a.test/_next/image?url=%2Fa.png&w=64&q=75')), false)
})

test('the cache key drops only the deployment query', () => {
  assert.equal(
    policy.withoutDeploymentQuery(new URL('https://a.test/_next/static/media/f.woff2?dpl=v1')),
    'https://a.test/_next/static/media/f.woff2',
  )
  assert.equal(
    policy.withoutDeploymentQuery(new URL('https://a.test/_next/image?url=%2Fa.png&w=64&dpl=v2')),
    'https://a.test/_next/image?url=%2Fa.png&w=64',
  )
  const plain = 'https://a.test/_next/static/chunks/abc.js'
  assert.equal(policy.withoutDeploymentQuery(new URL(plain)), plain)
})

test('the worker keeps hashed files, the precache and data caches under fixed names', () => {
  for (const name of ['STATIC_CACHE', 'ASSET_CACHE', 'PRECACHE', 'DYNAMIC_CACHE', 'CROSS_ORIGIN_CACHE']) {
    assert.match(sw, new RegExp(`cacheName: ${name}\\b`), `${name} is used as a cache name`)
  }
  const versioned = [...sw.matchAll(/cacheName: `\$\{CACHE_NAMESPACE\}-([a-z-]+)`/g)].map((match) => match[1]).sort()
  assert.deepEqual(versioned, ['documents', 'dynamic-rsc', 'static-rsc'])
  assert.match(sw, /outdatedCacheNames\(cacheNames, CACHE_NAMESPACE\)/)
})
