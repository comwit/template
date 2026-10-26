import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import type { Database } from "@/server/db";
import * as schema from "@/server/db/schema";
const context = vi.hoisted(() => ({ db: null as Database | null }));
vi.mock("@/server/db", () => ({ getDb: async () => context.db! }));
vi.mock("next/server", () => ({ connection: async () => undefined }));
vi.mock("@/server/config", () => ({
  config: {
    NODE_ENV: "development",
    ADMIN_AUTH_SECRET: "fixture-secret-for-local-tests-only-123456789",
    APP_URL: "http://localhost:3000",
  },
  requireServerConfig: (key: string) =>
    key === "APP_URL"
      ? "http://localhost:3000"
      : "fixture-secret-for-local-tests-only-123456789",
}));
import { createAdminAuthForProvisioning } from "@/server/auth/admin";
let directory: string;
let client: Client;
beforeEach(async () => {
  directory = mkdtempSync(join(tmpdir(), "commerce-auth-test-"));
  client = createClient({ url: `file:${join(directory, "auth.db")}` });
  const db = drizzle(client, { schema });
  context.db = db as unknown as Database;
  await migrate(db, { migrationsFolder: "migrations" });
});
afterEach(() => {
  client.close();
  rmSync(directory, { recursive: true, force: true });
});
it("disables public admin signup even when the submitted body is valid", async () => {
  const auth = await createAdminAuthForProvisioning();
  const response = await auth.handler(
    new Request("http://localhost:3000/admin/api/auth/sign-up/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        email: "public-signup@example.test",
        password: "fixture-password-only",
        name: "Unauthorized signup",
      }),
    }),
  );
  expect(response.status).toBeGreaterThanOrEqual(400);
  const createResponse = await auth.handler(
    new Request("http://localhost:3000/admin/api/auth/admin/create-user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        email: "public-create@example.test",
        password: "fixture-password-only",
        name: "Unauthorized admin",
        role: "admin",
      }),
    }),
  );
  expect(createResponse.status).toBeGreaterThanOrEqual(400);
  expect(await context.db!.select().from(schema.adminAuthUser)).toHaveLength(0);
});
it("provisions through the server-only API, signs in and revokes the session immediately", async () => {
  const auth = await createAdminAuthForProvisioning();
  await auth.api.createUser({
    body: {
      email: "operator@example.test",
      password: "fixture-password-only",
      name: "Local test operator",
      role: "admin",
    },
  });
  const signIn = await auth.api.signInEmail({
    body: { email: "operator@example.test", password: "fixture-password-only" },
    asResponse: true,
  });
  expect(signIn.status).toBe(200);
  const cookie = signIn.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
  const headers = new Headers({ cookie, origin: "http://localhost:3000" });
  const session = await auth.api.getSession({ headers });
  expect(session?.user.role).toBe("admin");
  await auth.api.signOut({ headers });
  expect(await auth.api.getSession({ headers })).toBeNull();
});
