import "server-only";

/**
 * Server-side configuration
 *
 * Read ordinary server settings here (API keys, secrets, etc.).
 * Define every config entry as a getter; read env inside it so values are
 * resolved on access instead of being captured when this module is imported.
 * DB/Storage server-only modules may read process.env directly.
 * Node configuration such as drizzle.config.ts must not import this module.
 * This file is protected by 'server-only' - it cannot be imported in client components.
 *
 * Usage:
 * import { config } from '@/server/config';
 * const apiKey = config.SOME_API_KEY;
 */

export const config = {
  get NODE_ENV() {
    return process.env.NODE_ENV ?? "production";
  },

  // Project and App identifiers are not secrets. Project setup writes them to
  // the gitignored .env file; CG injects the same keys in production.
  get COMWIT_PROJECT() {
    return process.env.COMWIT_PROJECT;
  },
  get COMWIT_APP() {
    return process.env.COMWIT_APP;
  },

  // Deployment URL: base for absolute URLs such as og:image and sitemap. The default is
  // https://<COMWIT_APP without svc_>.app.comwit.link. Change this line for a custom domain.
  get SITE_URL() {
    const app = process.env.COMWIT_APP;
    return app ? `https://${app.replace(/^svc_/, "")}.app.comwit.link` : undefined;
  },

  // Resource bindings stay in the gitignored .env locally. CG injects the
  // same non-secret keys for hosted builds/runtime.
  get COMWIT_DATABASE_ID() {
    return process.env.COMWIT_DATABASE_ID;
  },
  get DATABASE_URL() {
    return process.env.DATABASE_URL;
  },
  get COMWIT_STORAGE_ID() {
    return process.env.COMWIT_STORAGE_ID;
  },
  get COMWIT_STORAGE_ENDPOINT() {
    return process.env.COMWIT_STORAGE_ENDPOINT;
  },
  get COMWIT_STORAGE_BUCKET() {
    return process.env.COMWIT_STORAGE_BUCKET;
  },
  get COMWIT_STORAGE_PUBLIC_BASE_URL() {
    return process.env.COMWIT_STORAGE_PUBLIC_BASE_URL;
  },

  // COMWIT_CLOUD_TOKEN is the single runtime data-plane credential. Local
  // development uses a user cwt_ token; production uses a project cwp_ token.
  // COMWIT_DEPLOY_TOKEN intentionally does not belong in runtime config.
  get COMWIT_CLOUD_TOKEN() {
    return process.env.COMWIT_CLOUD_TOKEN;
  },
} as const;

export type ServerConfigKey = keyof typeof config;

/** Read a required server value without ever including its value in errors. */
export function requireServerConfig(key: ServerConfigKey): string {
  const value = config[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Required server configuration is missing: ${key}`);
  }
  return value;
}
