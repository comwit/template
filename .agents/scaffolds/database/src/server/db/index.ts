import "server-only";
import { type Client as LibsqlClient } from "@libsql/client/web";
import { type Client, type Config, type InArgs, type InStatement, createClient } from "@tursodatabase/serverless/compat";
import { drizzle } from "drizzle-orm/libsql/web";
import * as schema from "./schema";

const readClientConfig = (): Config => {
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
  return { url, authToken };
};

// Workers-style runtimes (workerd) cancel a request that waits on a promise
// another request created. The serverless client queues every call behind its
// own lock, so a client shared by concurrent requests can hand that lock to a
// cancelled request and stall every later query. Drizzle stays shared, but each
// operation opens its own client; creating one only allocates an object.
const createOperationClient = (config: Config) => {
  const open = () => createClient(config);
  const client: Pick<Client, "execute" | "batch" | "migrate" | "transaction" | "executeMultiple"> = {
    execute: (statement: InStatement, args?: InArgs) =>
      typeof statement === "string" ? open().execute(statement, args) : open().execute(statement),
    batch: (...args: Parameters<Client["batch"]>) => open().batch(...args),
    migrate: (...args: Parameters<Client["migrate"]>) => open().migrate(...args),
    transaction: (...args: Parameters<Client["transaction"]>) => open().transaction(...args),
    executeMultiple: (...args: Parameters<Client["executeMultiple"]>) => open().executeMultiple(...args),
  };
  return client as unknown as LibsqlClient;
};

const createDb = () => drizzle({
  client: createOperationClient(readClientConfig()),
  schema,
});

let dbInstance: ReturnType<typeof createDb> | null = null;

// DATABASE_URL and COMWIT_CLOUD_TOKEN are app-runtime configuration, not
// request-scoped bindings, so the lazy Drizzle instance and its validated
// config can be reused in one isolate. No promise or lock is shared.
export const getDb = async () => {
  dbInstance ??= createDb();
  return dbInstance;
};

export type Database = Awaited<ReturnType<typeof getDb>>;
