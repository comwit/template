/**
 * drizzle-kit compatibility shim for Comwit Cloud libSQL.
 *
 * drizzle-kit's bundled libSQL client currently drops the database-id path and
 * targets an older pipeline version. drizzle.config.ts passes the validated
 * DATABASE_URL into this installer; application runtime fetch is unaffected.
 */
export function installComwitLibsqlProxy(databaseUrl: string): void {
  let database: URL;
  try {
    database = new URL(databaseUrl);
  } catch {
    throw new Error("DATABASE_URL is not a valid URL");
  }
  if (!["https:", "libsql:"].includes(database.protocol) || !database.hostname ||
      database.username || database.password || database.search || database.hash) {
    throw new Error("DATABASE_URL must use https: or libsql: without credentials, query, or fragment");
  }
  // Native fetch requires HTTPS. Both accepted schemes retain the Cloud DB path.
  const target = new URL(database.toString().replace(/^libsql:/, "https:"));
  target.pathname = `${target.pathname.replace(/\/+$/, "")}/v3/pipeline`;
  const originalFetch = globalThis.fetch;

  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const inputUrl =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;

    if (!inputUrl.includes("/pipeline")) return originalFetch(input, init);

    if (typeof input === "string") return originalFetch(target.toString(), init);
    if (input instanceof URL) return originalFetch(target, init);
    return originalFetch(new Request(target, input), init);
  }) as typeof fetch;
}
