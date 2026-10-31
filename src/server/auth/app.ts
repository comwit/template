import "server-only";

import { betterAuth, type BetterAuthOptions } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { connection } from "next/server";
import { cache } from "react";
import { getDb } from "@/server/db";
import {
  appAuthUser,
  appAuthSession,
  appAuthAccount,
  appAuthVerification,
} from "@/server/db/schema";
import { config, requireServerConfig } from "@/server/config";

async function createAuth() {
  // betterAuth() calls Math.random(); with cacheComponents it must run at
  // request time, so opt out of prerendering before creating the instance.
  await connection();
  const db = await getDb();

  const authOptions: BetterAuthOptions = {
    secret: requireServerConfig("APP_AUTH_SECRET"),
    basePath: "/app/api/auth",
    // Detect the current hosted domain from the request so newly connected
    // domains work without an additional URL environment variable.
    baseURL: {
      fallback: requireServerConfig("APP_URL"),
      allowedHosts: [new URL(requireServerConfig("APP_URL")).host],
      protocol: config.NODE_ENV === "development" ? "auto" : "https",
    },
    database: drizzleAdapter(db, {
      provider: "sqlite",
      // better-auth looks up tables by the keys `user`, `session`, `account`,
      // `verification`. Because our tables are prefixed per service, you MUST
      // pass an explicit mapping here. `schema: schema` (the whole module) will
      // fail at runtime with "The model 'user' was not found in the schema".
      schema: {
        user: appAuthUser,
        session: appAuthSession,
        account: appAuthAccount,
        verification: appAuthVerification,
      },
    }),
    emailAndPassword: {
      enabled: true,
    },
    session: {
      cookieCache: {
        enabled: true,
        maxAge: 60 * 60,
        strategy: "compact",
        version: "1",
      },
    },
    account: {
      skipStateCookieCheck: true,
    },
    // Keep nextCookies last so refreshed session/cache cookies from Server
    // Actions are written to the Next.js response.
    plugins: [nextCookies()],
    advanced: {
      cookiePrefix: "app",
      useSecureCookies: true,
      defaultCookieAttributes: {
        sameSite: "None",
      },
    },
    trustedOrigins: [requireServerConfig("APP_URL")],
  };

  return betterAuth(authOptions);
}

// Keep Better Auth request-scoped so mutable auth state cannot cross warm
// brrrd isolate requests. The underlying libSQL connection uses app env.
export const getAppAuth = cache(createAuth);

export const getAppServerSession = cache(async () => {
  const auth = await getAppAuth();
  return auth.api.getSession({
    headers: await import("next/headers").then((m) => m.headers()),
  });
});
