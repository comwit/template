<!-- comwit:slot data -->
- Data goes through `src/server/repository/` backed by the Drizzle client in
  `src/server/db/`. `_data/` mock files are seed/reference only; move any
  remaining mock reads to Drizzle queries and keep repository signatures.
- Every new query needs a matching index in `src/server/db/schema.ts`.
<!-- /comwit:slot -->
<!-- comwit:slot stack -->
**Database**: Comwit Cloud libSQL with Drizzle. Server-only modules read
`DATABASE_URL` and `COMWIT_CLOUD_TOKEN` from `process.env`; `drizzle.config.ts`
loads `.env` itself and never imports `config.ts` or `server-only`.

Schema changes: edit `src/server/db/schema.ts`, run `pnpm drizzle-kit generate`,
read and summarize the generated SQL, and run `pnpm drizzle-kit migrate` only
after explicit user approval. It applies to the remote Cloud database at once.
Never edit generated migrations or the database directly. Seed and query only
through project-owned server-only scripts or repositories, never a CLI.
<!-- /comwit:slot -->
<!-- comwit:slot structure -->
- `src/server/db/` — Drizzle `schema.ts` and the libSQL client `index.ts`;
  `drizzle.config.ts` and `comwit-libsql-proxy.ts` live at the project root.
<!-- /comwit:slot -->
