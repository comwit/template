/// <reference lib="webworker" />

import type {
  PrecacheEntry,
  SerwistGlobalConfig,
  SerwistPlugin,
} from "serwist";
import {
  CacheFirst,
  ExpirationPlugin,
  NetworkFirst,
  NetworkOnly,
  Serwist,
  StaleWhileRevalidate,
} from "serwist";

import { activateUpdate } from "../lib/service-worker/activate-update";
import {
  ASSET_CACHE,
  CROSS_ORIGIN_CACHE,
  DYNAMIC_CACHE,
  PRECACHE,
  STATIC_CACHE,
  isImmutableAsset,
  outdatedCacheNames,
  withoutDeploymentQuery,
} from "../lib/service-worker/cache-policy";

import { cacheableDocument } from "../lib/service-worker";

declare const __COMWIT_APP_VERSION__: string;
declare const __COMWIT_FAVICON_REVISION__: string;

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const APP_VERSION = __COMWIT_APP_VERSION__;
// Only documents and RSC payloads are deployment caches; see lib/service-worker/cache-policy.ts.
const CACHE_NAMESPACE = `comwit-${APP_VERSION}`;
const STATIC_RSC_STALE_SECONDS = 365 * 24 * 60 * 60;
const OFFLINE_URL = "/offline";
const DYNAMIC_PREFIXES = [
  "/api/",
  "/app/api/",
  "/admin/api/",
  "/mcp/",
  "/storage/",
];
const STATIC_ASSET_EXTENSIONS =
  /\.(?:css|js|mjs|woff2?|ttf|otf|eot|png|jpe?g|gif|svg|webp|avif|ico|webmanifest)$/i;

function hasDynamicPrefix(pathname: string) {
  return DYNAMIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isStaticAsset(request: Request, url: URL) {
  if (hasDynamicPrefix(url.pathname)) return false;
  if (url.pathname.startsWith("/_next/static/")) return true;
  if (url.pathname.startsWith("/_next/image")) return true;
  if (STATIC_ASSET_EXTENSIONS.test(url.pathname)) return true;

  return ["font", "image", "manifest", "script", "style", "worker"].includes(
    request.destination,
  );
}

function hasPrivateCacheControl(response: Response) {
  const cacheControl = response.headers.get("cache-control") ?? "";
  return /(?:^|,)\s*(?:no-store|private)\b/i.test(cacheControl);
}

const cacheSuccessfulResponse: SerwistPlugin = {
  async cacheWillUpdate({ response }) {
    return response.status === 200 ? response : null;
  },
};

const cachePublicResponse: SerwistPlugin = {
  async cacheWillUpdate({ response }) {
    if (response.status !== 200 || hasPrivateCacheControl(response)) return null;
    return response;
  },
};

// Same file, same key across deployments: drop Next's `?dpl=` query from the cache key.
const deploymentFreeKey: SerwistPlugin = {
  async cacheKeyWillBeUsed({ request }) {
    return withoutDeploymentQuery(new URL(request.url));
  },
};

const cacheStaticDocumentResponse: SerwistPlugin = {
  cacheWillUpdate: ({ response }) => cacheableDocument(response),
};

const cacheStaticRscResponse: SerwistPlugin = {
  async cacheWillUpdate({ request, response }) {
    if (response.status !== 200 || hasPrivateCacheControl(response)) return null;
    if (!(response.headers.get("content-type") ?? "").startsWith("text/x-component")) {
      return null;
    }

    // Cache Components route-tree prefetches are deployment-pinned static RSC,
    // but they do not include x-nextjs-stale-time. Detect that special shell.
    if (request.headers.get("next-router-segment-prefetch") === "/_tree") {
      return response;
    }

    const staleSeconds = Number(response.headers.get("x-nextjs-stale-time"));
    return Number.isFinite(staleSeconds) && staleSeconds >= STATIC_RSC_STALE_SECONDS
      ? response
      : null;
  },
};

// Content-hashed files never change in place: serve from cache, keep the recently used ones.
const immutableAssets = new CacheFirst({
  cacheName: STATIC_CACHE,
  plugins: [
    deploymentFreeKey,
    cacheSuccessfulResponse,
    new ExpirationPlugin({
      maxEntries: 400,
      maxAgeSeconds: 60 * 24 * 60 * 60,
      maxAgeFrom: "last-used",
      purgeOnQuotaError: true,
    }),
  ],
});
// Unhashed files can change under the same URL: answer from cache, refresh in the background.
const staticAssets = new StaleWhileRevalidate({
  cacheName: ASSET_CACHE,
  plugins: [
    deploymentFreeKey,
    cacheSuccessfulResponse,
    new ExpirationPlugin({
      maxEntries: 200,
      maxAgeSeconds: 30 * 24 * 60 * 60,
      maxAgeFrom: "last-used",
      purgeOnQuotaError: true,
    }),
  ],
});
const staticRsc = new CacheFirst({
  cacheName: `${CACHE_NAMESPACE}-static-rsc`,
  // Cache Storage owns the deployment lifetime; do not refill it from an old HTTP cache.
  fetchOptions: { cache: "no-store" },
  plugins: [cacheStaticRscResponse],
});
const staticDocuments = new CacheFirst({
  cacheName: `${CACHE_NAMESPACE}-documents`,
  plugins: [cacheStaticDocumentResponse],
});
const dynamicRsc = new NetworkFirst({
  cacheName: `${CACHE_NAMESPACE}-dynamic-rsc`,
  fetchOptions: { cache: "no-store" },
  networkTimeoutSeconds: 4,
  plugins: [cachePublicResponse],
});
const dynamicRequests = new NetworkFirst({
  cacheName: DYNAMIC_CACHE,
  networkTimeoutSeconds: 4,
  plugins: [
    cachePublicResponse,
    new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 7 * 24 * 60 * 60, purgeOnQuotaError: true }),
  ],
});

const serwist = new Serwist({
  cacheId: CACHE_NAMESPACE,
  // One precache across deployments: an install downloads only entries whose revision changed.
  // The offline page links this deployment's chunks, so it follows the app version.
  precacheEntries: [
    { url: OFFLINE_URL, revision: APP_VERSION },
    { url: "/manifest.webmanifest", revision: APP_VERSION },
    { url: "/favicon.ico", revision: __COMWIT_FAVICON_REVISION__ },
  ],
  precacheOptions: {
    cacheName: PRECACHE,
    cleanupOutdatedCaches: true,
  },
  // Updates wait for user acceptance; controllerchange reloads the document
  // only after the new worker takes control.
  skipWaiting: false,
  clientsClaim: true,
  navigationPreload: true,
  disableDevLogs: true,
  runtimeCaching: [
    {
      matcher: ({ sameOrigin, url }) =>
        sameOrigin &&
        (url.pathname === "/sw.js" || url.pathname === "/version.json"),
      handler: new NetworkOnly(),
    },
    {
      matcher: ({ sameOrigin, url }) => sameOrigin && isImmutableAsset(url),
      handler: immutableAssets,
    },
    {
      matcher: ({ request, sameOrigin, url }) =>
        sameOrigin && isStaticAsset(request, url),
      handler: staticAssets,
    },
    {
      matcher: ({ request, sameOrigin, url }) =>
        sameOrigin &&
        !hasDynamicPrefix(url.pathname) &&
        request.headers.get("rsc") === "1" &&
        // Include normal, runtime, and app-shell Cache Components prefetches.
        // The response plugin decides which ones qualify for persistent cache.
        request.headers.has("next-router-prefetch"),
      handler: staticRsc,
    },
    {
      matcher: ({ request, sameOrigin, url }) =>
        sameOrigin &&
        !hasDynamicPrefix(url.pathname) &&
        request.headers.get("rsc") === "1",
      handler: dynamicRsc,
    },
    {
      matcher: ({ request, sameOrigin, url }) =>
        sameOrigin &&
        !hasDynamicPrefix(url.pathname) &&
        (request.mode === "navigate" || request.destination === "document"),
      handler: staticDocuments,
    },
    {
      matcher: ({ sameOrigin, url }) =>
        sameOrigin && url.pathname.startsWith("/api/auth/"),
      handler: new NetworkOnly(),
    },
    {
      matcher: ({ sameOrigin }) => sameOrigin,
      handler: dynamicRequests,
    },
    {
      matcher: ({ sameOrigin }) => !sameOrigin,
      handler: new NetworkFirst({
        cacheName: CROSS_ORIGIN_CACHE,
        networkTimeoutSeconds: 4,
        plugins: [
          cachePublicResponse,
          new ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 7 * 24 * 60 * 60, purgeOnQuotaError: true }),
        ],
      }),
    },
  ],
  fallbacks: {
    entries: [
      {
        url: OFFLINE_URL,
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();

// A new deployment removes only older deployment caches (documents, RSC) and caches
// of older workers. Hashed files, the precache and data caches stay.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        outdatedCacheNames(cacheNames, CACHE_NAMESPACE).map((cacheName) =>
          caches.delete(cacheName),
        ),
      ),
    ),
  );
});

// Only the requesting window may be open when it accepts an update. Other
// tabs (including uncontrolled ones) may contain unsaved work.
self.addEventListener("message", (event) => {
  if (event.data?.type !== "COMWIT_APPLY_UPDATE") return;
  const source = event.source;
  if (!source || !("id" in source)) return;
  event.waitUntil(
    activateUpdate(self, source.id).then((result) => {
      event.ports[0]?.postMessage(result);
    }),
  );
});

// Focus a matching app window when a push notification is clicked, or open the
// target path in a new window when there is no matching client.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data as { url?: unknown } | undefined;
  const targetUrl = typeof data?.url === "string" ? data.url : "/";

  let targetPath = "/";
  try {
    targetPath = new URL(targetUrl, self.location.origin).pathname;
  } catch {
    targetPath = "/";
  }

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const client of windows) {
        try {
          if (new URL(client.url).pathname === targetPath) {
            await client.focus();
            return;
          }
        } catch {
          // Ignore clients with unreadable URLs such as about:blank.
        }
      }

      if (self.clients.openWindow) {
        try {
          await self.clients.openWindow(targetUrl);
          return;
        } catch {
          // Fall back to an existing client if a new window cannot be opened.
        }
      }

      for (const client of windows) {
        try {
          await client.focus();
          await client.navigate(targetUrl);
          return;
        } catch {
          // Try the next available client.
        }
      }
    })(),
  );
});
