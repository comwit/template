import type { NextConfig } from "next";
import { execSync } from "node:child_process";
import { createRequire } from "node:module";
import { withServerFn } from "./src/lib/server-action/next";

const require = createRequire(import.meta.url);

function resolveAppVersion(): string {
  const envVersion =
    process.env.NEXT_DEPLOYMENT_ID ||
    process.env.DEPLOYMENT_VERSION ||
    process.env.GIT_SHA ||
    process.env.GIT_COMMIT_SHA;

  if (envVersion?.trim()) return envVersion.trim();

  try {
    return execSync("git rev-parse HEAD", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "local";
  }
}

const appVersion = resolveAppVersion();
const STATIC_SHELL_CACHE_SECONDS = 365 * 24 * 60 * 60;

const nextConfig: NextConfig = {
  // Comwit Cloud's brrrd build adapter emits dist/brrrd during `next build`.
  adapterPath: require.resolve("./scripts/brrrd-adapter.mjs"),
  // Keep libSQL's websocket implementation outside the server bundle. The
  // brrrd runtime loads it from the packaged node_modules tree.
  serverExternalPackages: ["@libsql/isomorphic-ws"],
  reactStrictMode: false,
  deploymentId: appVersion,
  env: {
    NEXT_PUBLIC_COMWIT_APP_VERSION: appVersion,
  },
  // Cache Components separates reusable static shells/RSC payloads from
  // request-time data. Partial Prefetching then fetches only the reusable shell.
  cacheComponents: true,
  partialPrefetching: true,
  // Allow previews on managed hosts other than localhost so the dev server does not
  // block cross-origin HMR, scripts, and other development resources.
  // '**' also matches nested subdomains such as a.b.mvpstar.net.
  allowedDevOrigins: [
    "**.comwit.io",
    "**.mvpstar.ai",
  ],
  experimental: {
    // Reuse static RSC payloads for the lifetime of this deployment. Dynamic
    // payloads always revalidate, matching the service worker's cache boundary.
    staleTimes: {
      dynamic: 0,
      static: STATIC_SHELL_CACHE_SECONDS,
    },
    serverActions: {
      bodySizeLimit: "100mb", // Increase the default 1 MB limit to 100 MB for large image uploads.
    },
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/version.json",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
    ];
  },
};

export default withServerFn(nextConfig);
