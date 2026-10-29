import "server-only";

import { betterAuth, type BetterAuthOptions } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins/admin";
import { connection } from "next/server";
import { cache } from "react";
import { INTERNAL_ADMIN_AUTH_BASE_PATH } from "@/lib/admin-routes";
import { getDb } from "@/server/db";
import {
  adminAuthUser,
  adminAuthSession,
  adminAuthAccount,
  adminAuthVerification,
} from "@/server/db/schema";
import { config, requireServerConfig } from "@/server/config";

async function createAuth() {
  await connection();
  return createAdminAuthForProvisioning();
}

/** Server-only factory for explicit initial account provisioning; never expose as a route. */
export async function createAdminAuthForProvisioning() {
  const db = await getDb();

  const authOptions = {
    secret: requireServerConfig("ADMIN_AUTH_SECRET"),
    basePath: INTERNAL_ADMIN_AUTH_BASE_PATH,
    baseURL: {
      fallback: requireServerConfig("APP_URL"),
      allowedHosts: [new URL(requireServerConfig("APP_URL")).host],
      protocol: config.NODE_ENV === "development" ? "auto" : "https",
    },
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema: {
        user: adminAuthUser,
        session: adminAuthSession,
        account: adminAuthAccount,
        verification: adminAuthVerification,
      },
    }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
    },
    plugins: [
      admin({
        defaultRole: "admin",
        adminRoles: ["admin"],
      }),
    ],
    account: {
      skipStateCookieCheck: true,
    },
    advanced: {
      cookiePrefix: "admin",
      useSecureCookies: true,
      defaultCookieAttributes: {
        sameSite: "None",
      },
    },
    trustedOrigins: [requireServerConfig("APP_URL")],
  } satisfies BetterAuthOptions;

  return betterAuth(authOptions);
}

export const getAdminAuth = cache(createAuth);

export const getAdminServerSession = cache(async () => {
  const auth = await getAdminAuth();
  return auth.api.getSession({
    headers: await import("next/headers").then((m) => m.headers()),
  });
});
