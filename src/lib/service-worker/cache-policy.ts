/**
 * Which service worker caches outlive a deployment.
 *
 * A deployment only invalidates what is built for it: documents and RSC payloads. They live in
 * caches named after the deployment, and a new worker deletes the older ones when it activates.
 * Everything else keeps one fixed cache name:
 * - `/_next/static/*` (JS, CSS, next/font files) is content-hashed and never changes in place,
 *   so an unchanged chunk or font is reused after a deploy instead of being downloaded again.
 * - Unhashed same-origin files (public files, `/_next/image`) are revalidated in the background.
 * - The precache keeps one name; Serwist re-downloads only entries whose revision changed.
 */
export const STATIC_CACHE = 'comwit-static'
export const ASSET_CACHE = 'comwit-assets'
export const PRECACHE = 'comwit-precache'
export const DYNAMIC_CACHE = 'comwit-dynamic'
export const CROSS_ORIGIN_CACHE = 'comwit-cross-origin'

/** Caches kept across deployments: never removed by the version cleanup. */
export const PERSISTENT_CACHE_NAMES: readonly string[] = [
  STATIC_CACHE,
  ASSET_CACHE,
  PRECACHE,
  DYNAMIC_CACHE,
  CROSS_ORIGIN_CACHE,
]

/** Content-hashed build output, including next/font files. */
export function isImmutableAsset(url: URL) {
  return url.pathname.startsWith('/_next/static/')
}

/**
 * Next appends `?dpl=<deployment id>` to asset and font URLs, so every deployment changes the
 * URL of every file. The cache key drops it; the network request keeps it.
 */
export function withoutDeploymentQuery(url: URL) {
  if (!url.searchParams.has('dpl')) return url.href
  const key = new URL(url.href)
  key.searchParams.delete('dpl')
  return key.href
}

/**
 * `comwit-*` caches to delete when the worker for `namespace` (`comwit-<version>`) activates:
 * deployment caches of other versions and caches of older workers, never the persistent ones.
 */
export function outdatedCacheNames(cacheNames: readonly string[], namespace: string) {
  return cacheNames.filter(
    (cacheName) =>
      cacheName.startsWith('comwit-') &&
      !cacheName.startsWith(`${namespace}-`) &&
      !PERSISTENT_CACHE_NAMES.includes(cacheName),
  )
}
