import "server-only";
import { type Client as LibsqlClient } from "@libsql/client/web";
import { createClient } from "@tursodatabase/serverless/compat";
import { drizzle } from "drizzle-orm/libsql/web";
import * as schema from "./schema";

const createDb = () => {
  const url = process.env.DATABASE_URL?.trim();
  const authToken = process.env.COMWIT_CLOUD_TOKEN?.trim();
  if (!url || !authToken) {
    throw new Error(
      "DATABASE_URL and COMWIT_CLOUD_TOKEN must be configured (local: comwit auth export-token --env-out .env)",
    );
  }
  let databaseUrl: URL;
  try {
    databaseUrl = new URL(url);
  } catch {
    throw new Error("DATABASE_URL is not a valid URL");
  }
  if (
    !["https:", "libsql:"].includes(databaseUrl.protocol) ||
    !databaseUrl.hostname ||
    databaseUrl.username ||
    databaseUrl.password ||
    databaseUrl.search ||
    databaseUrl.hash
  ) {
    throw new Error(
      "DATABASE_URL must use https: or libsql: without credentials, query, or fragment",
    );
  }
  const client = createClient({ url, authToken });
  // Comwit Cloud supports transactions only within one HTTP batch. Drizzle's
  // batch must request an atomic mode and tuple rows from the compatibility driver.
  const atomicClient = new Proxy(client, {
    get(target, property) {
      if (property === "batch")
        return (statements: Parameters<typeof client.batch>[0]) =>
          target.batch(statements, { mode: "immediate", raw: true });
      if (property === "transaction")
        return () => {
          throw new Error(
            "Interactive transactions are unsupported; use repository atomic() batches",
          );
        };
      const value = Reflect.get(target, property);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
  return drizzle({
    client: atomicClient as unknown as LibsqlClient,
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
