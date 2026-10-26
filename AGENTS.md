# Next.js Development Assistant

You help non-developer users build a Comwit project through voice/chat.
Comwit-side work (deploy, database, storage, env, docs, kanban, cron) goes
through the Comwit MCP; run the `nextSteps` it returns as written.
Claude Code and Codex already have the Comwit MCP configured through the same
`.agents/scripts/comwit-mcp.mjs` stdio bridge. Never register it again or issue an
MCP PAT. The bridge reads `.env` on each request and sends `COMWIT_PROJECT_ID`
and nullable `USER_ID` in the request body. `USER_ID` is attribution, never an
access credential; leave it empty for the AI profile instead of guessing an ID.
Local sessions use the cwt_ from `comwit login`; web coding sessions receive a
project-owned cwp_ from the server. A valid cwp_ has full MCP access only within
its bound project, regardless of Git scopes. USER_ID may name a member of that
project for attribution or stay empty for AI; it never selects resource authority.
Project, database, storage and app targets come from verified server bindings.
`COMWIT_PROJECT` is the separate Cloud resource ID; do not interchange them.
For first setup or a clone without `.env`, use the project's setup prompt from
Comwit (it includes the IDs), check prerequisites and `comwit login`, then run
the prompt's environment merge and token export commands. Do not try to call
MCP before its project context exists. For a stale resource environment with
working MCP, call `list_cloud_resources` and run its `nextSteps`. Never hand-write
resource IDs or `DATABASE_URL`. Do not start the dev server during setup.

---

## First shop request

For the first storefront request in a generated project, use the `shop-setup` skill
while it is installed. It selects a brand reference, preserves commerce/admin
behavior, guides MCP resource setup and removes only its own bootstrap files
after successful checks. Do not run that one-time cleanup in this source repository.

## Development Flow

1. **Screens first** with mock data; connect a DB only when the product needs real persistence.
2. **Dependency flow:** `page → state → api → repository`. Write bottom-up
   (`repository → api → state → page`) and read each layer's `.ai.md` first.
3. Read `.storybook/stories/design-system/design.mdx` and `.storybook/stories/.ai.md`
   for screen work. Keep shop page stories in `src/stories/` and mock only the
   public API boundary, preserving the real state/query/action flow.

- Data goes through `src/server/repository/` backed by the Drizzle client in
  `src/server/db/`. `_data/` mock files are seed/reference only; move any
  remaining mock reads to Drizzle queries and keep repository signatures.
- Every new query needs a matching index in `src/server/db/schema.ts`.
- Interactive `db.transaction()` is unsupported by the Cloud HTTP transport;
  commerce writes use `repository/atomic.ts`.

---

## Tech Stack & Rules

| Item | Rule |
|------|------|
| Package Manager | pnpm (not npm) |
| Framework | Next.js 16.4.3 App Router in `src/app/` (routing only) |
| Runtime | Comwit Cloud brrrd via `@brrrd/adapter`; `next build` emits `dist/brrrd` |
| API | `createAction` + `resolveActions` via `src/lib/server-action/`; browser calls use the dedicated POST route. Read `src/services/api.ai.md` for the source/build contract |
| UI | comwit-ui in `src/lib/components/ui`. Missing component → `pnpm ui add <name>`. Theme via `src/app/globals.css` tokens; Korean UI text in `src/lib/ui-text.ts` |
| File Naming | kebab-case (`hero-section.tsx`) |
| Image | `<img />`, not `<Image />` |
| Loading | Auth user is hydrated once at the service root (`src/services/page.ai.md`); other data loads lazily via query + `isLoading` |
| Env | Server config goes through `src/server/config.ts`. Define every `config` entry as a getter and read environment values inside it, never snapshot them at module load. Never expose secrets to the client, args, output or logs |

**Database**: Comwit Cloud libSQL with Drizzle. Server-only modules read
`DATABASE_URL` and `COMWIT_CLOUD_TOKEN` from `process.env`; `drizzle.config.ts`
loads `.env` itself and never imports `config.ts` or `server-only`.

Schema changes: edit `src/server/db/schema.ts`, run `pnpm drizzle-kit generate`,
read and summarize the generated SQL, and run `pnpm drizzle-kit migrate` only
after explicit user approval. It applies to the remote Cloud database at once.
Never edit generated migrations or the database directly. Seed and query only
through project-owned server-only scripts or repositories, never a CLI.

**Storage**: Comwit Storage through the Cloud presign API only
(`src/server/storage/index.ts`); there is no S3 SDK. Browser uploads follow
`resizeImageVariants` (1600px + 480px thumb) → presign → PUT → complete and store
the resulting `{ url, width, height, thumb }` as an `ImageAsset`
(`src/lib/image.ts`). Server-side seeds use `scripts/seed/images.ts` (sharp).

**Media**: site-owned videos never ship in Git or the app package — use the
`video-offload` skill. Fonts and design images stay local unless the user asks.

### Checks

- After every code change run `pnpm run validate` and fix all errors.
- Storybook checks/builds are separate from service validation. Missing or
  incomplete mocks must never fail service `validate` or `build`. Run
  `pnpm storybook:build` to verify the shop preview.
- Mutation testing runs only when the user explicitly asks for it — never as
  part of tests, validate, build or `/refactoring`.

---

## Project Structure

```
.agents/                - Skills, scripts, rules/workflows, DB/Storage fragments & scaffolds (the only copy)
.claude/skills/         - Claude Code stubs pointing at .agents/skills/
src/
  services/             - One folder per user type (default: app, admin)
    ㄴ .ai.md            - Import rules, layer dependencies
    ㄴ api.ai.md / state.ai.md / page.ai.md - Per-layer rules
    {service}/
      api/{domain}/     - Typed API objects + server action implementations
      state/{domain}/   - State (comwit)
      page/{route}/     - Page components
    admin/
      ㄴ .ai.md          - Admin routes, public prefix proxy, initial account
  app/                  - Next.js App Router (routing only)
    ㄴ .ai.md
  lib/                  - Shared components, hooks, utilities
  server/               - Server-only (config, repository)
    repository/         - Single gateway for all data access & mock data
      ㄴ .ai.md
```

Read the nearest `.ai.md` before working in a folder. Split out a new service
only for a genuinely different user type with its own screens.

- `src/server/db/` — Drizzle `schema.ts` and the libSQL client `index.ts`;
  `drizzle.config.ts` and `comwit-libsql-proxy.ts` live at the project root.
- `src/server/storage/` — presign client; `src/lib/image.ts` — `ImageAsset`
  type and `resizeImage` for browser uploads.

---

## Deploy

`COMWIT_EXECUTION_ENV` (process env, then `.env`) decides the path. Never guess it.

- **`local`**: `pnpm run validate` → `pnpm run build` →
  `comwit deploy --project <COMWIT_PROJECT> --app <COMWIT_APP> --package ./dist/brrrd`
  (`comwit login` if needed). Then give the link `https://<COMWIT_APP without svc_>.app.comwit.link`.
- **`sandbox`**: after validation say **"화면의 배포 버튼을 눌러주세요."** Do not deploy yourself.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
