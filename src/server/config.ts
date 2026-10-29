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
  get APP_URL() {
    return (
      process.env.APP_URL ||
      (process.env.COMWIT_APP
        ? `https://${process.env.COMWIT_APP.replace(/^svc_/, "")}.app.comwit.link`
        : undefined)
    );
  },
  get APP_AUTH_SECRET() {
    return process.env.APP_AUTH_SECRET;
  },
  get ADMIN_INITIAL_EMAIL() {
    return process.env.ADMIN_INITIAL_EMAIL;
  },
  get ADMIN_INITIAL_PASSWORD() {
    return process.env.ADMIN_INITIAL_PASSWORD;
  },
  get ADMIN_AUTH_SECRET() {
    return process.env.ADMIN_AUTH_SECRET;
  },
  get TOSS_CLIENT_KEY() {
    return process.env.TOSS_CLIENT_KEY;
  },
  get TOSS_SECRET_KEY() {
    return process.env.TOSS_SECRET_KEY;
  },
  get TOSS_MID() {
    return process.env.TOSS_MID;
  },
  get PAYMENT_MODE() {
    return process.env.PAYMENT_MODE ?? "test";
  },
  get PLATFORM_NAME() {
    return process.env.PLATFORM_NAME ?? "강의 플랫폼";
  },
  /** 미결제 주문이 자동 만료되기까지의 시간(분) */
  get ORDER_EXPIRY_MINUTES() {
    return process.env.ORDER_EXPIRY_MINUTES ?? "30";
  },
  /** 결제 후 수강생이 환불을 신청할 수 있는 기간(일) */
  get REFUND_WINDOW_DAYS() {
    return process.env.REFUND_WINDOW_DAYS ?? "7";
  },
  /** 진도율이 이 값(%) 이상이면 수강생 환불 신청을 막는다 */
  get REFUND_PROGRESS_LIMIT() {
    return process.env.REFUND_PROGRESS_LIMIT ?? "30";
  },
  get COURSE_CRON_SECRET() {
    return process.env.COURSE_CRON_SECRET;
  },
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

  // 배포 주소 — og:image·sitemap 같은 절대 URL의 기준. Comwit 앱 기본 주소는
  // https://<COMWIT_APP에서 svc_를 뺀 값>.app.comwit.link 이다. 커스텀 도메인은 SITE_URL 로 넣는다.
  // sitemap·robots·메타데이터는 빌드 때 정적으로 만들어진다. 로컬에서 빌드해 배포하면 COMWIT_APP 이
  // 없어 localhost 가 박히므로, .env 의 SITE_URL(또는 https APP_URL)을 함께 본다.
  get SITE_URL() {
    return (
      process.env.SITE_URL ||
      (process.env.COMWIT_APP
        ? `https://${process.env.COMWIT_APP.replace(/^svc_/, "")}.app.comwit.link`
        : process.env.APP_URL?.startsWith("https://")
          ? process.env.APP_URL
          : undefined)
    );
  },

  // Resource bindings stay in the gitignored .env locally. CG injects the
  // same non-secret keys as Gitea Actions Variables for hosted builds/runtime.
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
