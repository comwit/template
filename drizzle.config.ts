import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { defineConfig } from "drizzle-kit";
import { installComwitLibsqlProxy } from "./comwit-libsql-proxy";

// Drizzle Kit runs outside React's server runtime: never import server-only
// config.ts here. Node loads .env without evaluating shell expressions.
if (existsSync(".env")) loadEnvFile(".env");

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL must be configured in the gitignored .env file",
  );
}
const cloudToken = process.env.COMWIT_CLOUD_TOKEN?.trim();
if (!cloudToken) {
  throw new Error(
    "COMWIT_CLOUD_TOKEN must be configured in the gitignored .env file (local: comwit auth export-token --env-out .env)",
  );
}

installComwitLibsqlProxy(databaseUrl);

export default defineConfig({
  schema: "./src/server/db/schema.ts",
  out: "./migrations",
  dialect: "turso",
  dbCredentials: {
    url: databaseUrl,
    authToken: cloudToken,
  },
});
