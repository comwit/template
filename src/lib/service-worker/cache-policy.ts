/**
 * Which service worker caches outlive a deployment, and which file goes where.
 *
 * A deployment invalidates what is built for it: documents, RSC payloads, the build-id files
 * under `/_next/static/<build id>/` (same path in every build, different content) and unhashed
 * scripts and styles. They live in caches named after the deployment, and a new worker deletes
 * the older ones when it activates. Everything else keeps one fixed cache name:
 * - `/_next/static/chunks|media/*` (JS, CSS, next/font and imported files) is named by its
 *   content, so an unchanged chunk or font is reused after a deploy instead of being downloaded
 *   again. A changed file gets a new name, so new code is never answered with old bytes.
 * - Unhashed images and fonts (public files, `/_next/image`) are revalidated in the background.
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

/** Content-hashed build output: Next names every chunk, stylesheet, font and imported file by its content. */
export function isImmutableAsset(url: URL) {
  return url.pathname.startsWith('/_next/static/chunks/') || url.pathname.startsWith('/_next/static/media/')
}

const CODE_EXTENSIONS = /\.(?:css|js|mjs|webmanifest)$/i
const MEDIA_EXTENSIONS = /\.(?:woff2?|ttf|otf|eot|png|jpe?g|gif|svg|webp|avif|ico)$/i

/**
 * - `hashed`: content-named build output, kept across deployments.
 * - `build`: other `/_next/static` files (build-id manifests); same path in every build.
 * - `code`: unhashed scripts, styles and manifests; must match the deployed app.
 * - `media`: unhashed images and fonts; an outdated copy is shown at most once.
 * - `null`: not a static asset.
 */
export type AssetKind = 'hashed' | 'build' | 'code' | 'media'

export function assetKind(url: URL, destination: string): AssetKind | null {
  const { pathname } = url
  if (isImmutableAsset(url)) return 'hashed'
  if (pathname.startsWith('/_next/static/')) return 'build'
  if (pathname.startsWith('/_next/image')) return 'media'
  if (CODE_EXTENSIONS.test(pathname) || ['manifest', 'script', 'style', 'worker'].includes(destination)) {
    return 'code'
  }
  if (MEDIA_EXTENSIONS.test(pathname) || ['font', 'image'].includes(destination)) return 'media'
  return null
}

/** The cache each asset kind lives in; `namespace` is the deployment's `comwit-<version>`. */
export function assetCacheName(kind: AssetKind, namespace: string) {
  if (kind === 'hashed') return STATIC_CACHE
  if (kind === 'media') return ASSET_CACHE
  return `${namespace}-${kind}`
}

/**
 * Kinds whose cache key drops the deployment query. Only these: build-id files keep the same
 * path in every build, so the query is what tells two builds apart.
 */
export const DEPLOYMENT_FREE_KEY_KINDS: readonly AssetKind[] = ['hashed', 'media']

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
