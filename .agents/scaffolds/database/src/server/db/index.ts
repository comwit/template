import "server-only";
import { type Client as LibsqlClient } from "@libsql/client/web";
import { createClient } from "@tursodatabase/serverless/compat";
import { drizzle } from "drizzle-orm/libsql/web";
import * as schema from "./schema";

const createDb = () => {
  const url = process.env.DATABASE_URL?.trim();
  const authToken = process.env.COMWIT_CLOUD_TOKEN?.trim();
  if (!url || !authToken) {
    throw new Error("DATABASE_URL and COMWIT_CLOUD_TOKEN must be configured (local: comwit auth export-token --env-out .env)");
  }
  let databaseUrl: URL;
  try {
    databaseUrl = new URL(url);
  } catch {
    throw new Error("DATABASE_URL is not a valid URL");
  }
  if (!["https:", "libsql:"].includes(databaseUrl.protocol) || !databaseUrl.hostname ||
      databaseUrl.username || databaseUrl.password || databaseUrl.search || databaseUrl.hash) {
    throw new Error("DATABASE_URL must use https: or libsql: without credentials, query, or fragment");
  }
  const client = createClient({ url, authToken });
  return drizzle({
    client: client as unknown as LibsqlClient,
    schema,
  });
};

let dbInstance: ReturnType<typeof createDb> | null = null;

// DATABASE_URL and COMWIT_CLOUD_TOKEN are app-runtime configuration, not
// request-scoped bindings, so a lazy client can be reused in one isolate.
export const getDb = async () => {
  dbInstance ??= createDb();
  return dbInstance;
};

export type Database = Awaited<ReturnType<typeof getDb>>;
