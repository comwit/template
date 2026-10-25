# Comwit Cloud Next.js Template

A new-project template for Comwit Cloud. Next.js builds a `dist/brrrd` package through `@brrrd/adapter`; databases and storage use Comwit Cloud's libSQL/S3 data plane.

## Runtime

```bash
pnpm install
pnpm run validate
pnpm run build
```

A successful build produces `dist/brrrd/manifest.json`. Local Wrangler/OpenNext configuration is not used.

## Screen review with Storybook

Run `pnpm storybook` and open http://localhost:6006. `pnpm build-storybook` creates a static preview in `storybook-static/`. The sidebar orders **Design system → User → Admin** using localized labels. Every story is a page with its real layout; select states beneath that page.

**Mock only the API boundary**, retaining real state, pages, and layouts. Missing API mocks or included server implementations fail the Storybook build. Check Storybook types, lint, and mock boundaries separately with `pnpm validate:storybook`; unfinished mocks do not affect service `pnpm run validate` or `pnpm run build`. Use Storybook instead of `/design`. Follow [`.storybook/stories/.ai.md`](.storybook/stories/.ai.md).

## Agent configuration: `.agents/`

Root `AGENTS.md` is the single rule document; `CLAUDE.md` imports it through `@AGENTS.md`. Skills, scripts, rules, workflows, DB/storage fragments, and scaffolds live only in `.agents/`. Codex and Antigravity read `.agents/skills/` directly. Claude Code reads `.claude/skills/<name>/SKILL.md` stubs with identical frontmatter and a pointer to `.agents/skills/<name>/SKILL.md`. Maintain both directories when adding, changing, or deleting skills. No generation step or symlinks are involved. `pnpm agents:test` checks stub parity, the shared MCP runner, and environment merging.

## Local environment contract

Project handoff and DB/storage connections reuse a single Git-ignored `.env`. The Comwit MCP `setup_database` and `setup_storage` tools manage resource connections. `.mcp.json` (Claude Code) and `.codex/config.toml` (Codex) preregister the shared stdio runner `.agents/scripts/comwit-mcp.mjs`. Never register another MCP or issue a personal MCP PAT.

The runner reads `COMWIT_PROJECT_ID` and optional `USER_ID` from `.env` on each request and passes them in the body context. Missing `USER_ID` attributes work to AI; the field grants no access. New local connections use the `cwt_` from `comwit login` as `COMWIT_CLOUD_TOKEN`. The server verifies Cloud identity, project permissions, and per-member switching settings.

Web coding sessions receive a server-injected `cwp_`. Once Cloud validates it, this token has full MCP authority within its bound project, independent of Git scopes, and cannot access another project's DB, storage, or app. `USER_ID` may identify a member of that project for attribution or remain empty for AI. The server determines resource targets and execution identity, never the body user ID.

MCP responses contain non-secret environment values and `nextSteps`, never tokens. Do not expose tokens in LLM arguments, stdout, or logs, or paste all of `.env` into chat. Do not call Resource CLI or Cloud management APIs directly.

The shared `.agents/scripts/sync-resource-env.mjs` handles both initial project snapshots and DB/storage groups (`--resource project|database|storage`). Database/storage modes read MCP environment JSON from stdin, atomically merge only that group, and install `.agents/scaffolds/<resource>/` without overwriting existing files. Never copy DB/storage values into tracked source.

For local runtime credentials or CLI deployment, guide the user through browser approval in the `comwit login` device flow. After success, check `comwit projects list` and safely merge credentials with `comwit auth export-token --env-out .env`, without exposing the `cwt_`. New MCP connections use this Cloud login. Legacy project URLs and PATs remain server-compatible but are never registered or issued by this template.

For a fresh clone, pass the exact project JSON on stdin before exporting the token:

```bash
node .agents/scripts/sync-resource-env.mjs --resource project --env .env
```

Local setup payloads include `COMWIT_EXECUTION_ENV=local`; hosted sessions receive `COMWIT_EXECUTION_ENV=sandbox`. Do not infer the environment from `.env` existence. Setup requires `COMWIT_PROJECT`; `COMWIT_APP` is optional so DB/storage setup can proceed before an app exists. Omitting the app from the snapshot removes its previous local ID; deployment still requires an app ID.

Allowed keys include paired `COMWIT_DATABASE_ID`/`DATABASE_URL`, optional storage keys, `COMWIT_PROJECT_ID`/nullable `USER_ID`, and `NODE_ENV`/`PORT`. Secret and unknown keys are rejected. If `.env` is missing, verify ignored/untracked status and create it atomically with mode 0600. Existing files retain unrelated lines/comments, mode, and line endings. Never log values.

- MCP context: `COMWIT_PROJECT_ID` (internal project ID), optional `USER_ID` (AI when omitted).
- Cloud resource context: `COMWIT_PROJECT`, distinct from the MCP project ID.
- Optional for setup and required for deployment: `COMWIT_APP`.
- Runtime secret: `COMWIT_CLOUD_TOKEN` (`cwt_` user login / `cwp_` project authority; Cloud validates allowed operations).
- Optional DB binding: `COMWIT_DATABASE_ID` and `DATABASE_URL`, always paired.
- Optional storage binding: `COMWIT_STORAGE_ID`, `COMWIT_STORAGE_ENDPOINT`, `COMWIT_STORAGE_BUCKET`, `COMWIT_STORAGE_PUBLIC_BASE_URL`.
- Deployment-only secret: `COMWIT_DEPLOY_TOKEN`, never stored in `.env`.
- Legacy projects only: retain existing `COMWIT_API_TOKEN`/`COMWIT_PAT` and project-specific MCP URLs.

Projects need not use DB/storage; unselected resource keys may be absent or empty. Private or provisioning storage may also have no `COMWIT_STORAGE_PUBLIC_BASE_URL`. Calling an actual feature triggers clear required-environment errors in the server-only DB/storage modules.

Each handoff rereads Cloud details for server-stored app/DB/storage bindings. Binding IDs fix resource identity; fresh DB URLs and storage endpoints/buckets/public URLs update local `.env` automatically. Without a binding, zero candidates means unused, exactly one may bind automatically, and multiple candidates stop with an ambiguity error instead of an invented selection surface.

Project payloads are authoritative binding snapshots. Missing DB/storage groups remove only their previous managed `.env` keys, preserving `COMWIT_CLOUD_TOKEN`, comments, and unrelated keys. This reconciles local setup state; it is not a resource-unbinding API.

Call `setup_database` when persistence is needed and `setup_storage` when uploads are needed. Both are idempotent: an existing binding returns current values; one candidate binds; zero candidates creates by `name` (plus `public: true|false` for storage); multiple candidates return ambiguity. The server derives idempotency keys from name/public choices, so keep retry inputs unchanged. Run the returned `nextSteps` exactly to merge `.env` and install scaffolds:

```bash
node .agents/scripts/sync-resource-env.mjs --resource database <<'COMWIT_RESOURCE_ENV_JSON'
{ "COMWIT_DATABASE_ID": "...", "DATABASE_URL": "https://..." }
COMWIT_RESOURCE_ENV_JSON
```

After binding, the corresponding `setup_*` tool disappears. `list_cloud_resources` returns the same `env`/`nextSteps` for later inspection, `not_ready` polling (every five seconds, up to six attempts), and rebuilding `.env` on another computer. Only ready responses atomically update the selected resource group; errors or pending states preserve it.

`clearSupported:false` means no user/skill removal feature. Separate server-internal exact reconciliation removes stale public URLs after public-to-private changes or managed keys for null resource bindings. It is not a user removal API and preserves unrelated CG environment values.

## Database

The server-only DB client uses `process.env.DATABASE_URL` and `process.env.COMWIT_CLOUD_TOKEN` for libSQL. Retain the selected ID in paired `COMWIT_DATABASE_ID`. Accept Cloud HTTPS and libsql: URLs while preserving paths; reject URL credentials, queries, and fragments.

Drizzle configuration runs in Node outside React, so it loads `.env` directly and reads `process.env` without importing server-only `config.ts`. Ordinary server code continues using `config.ts`. Define every `config` entry as a getter that reads environment values inside it; consumers keep using `config.KEY`. Never snapshot environment values at import time. `custom/server-config-getters` enforces this.

Review all SQL generated by `pnpm drizzle-kit generate`. Run `pnpm drizzle-kit migrate` only after the user separately confirms remote application. Seed/query operations use project-owned server-only scripts or repositories through the configured Drizzle client.

## Storage

Use the Comwit Cloud presign API, without an S3 SDK. `src/server/storage/index.ts` obtains PUT/GET/DELETE URLs using `COMWIT_PROJECT`, `COMWIT_STORAGE_ID`, and `COMWIT_CLOUD_TOKEN`; server deletion also fetches the presigned DELETE URL. Storage ID, endpoint, bucket, and optional public URL come from environment values, never project-specific tracked constants.

MCP `setup_storage` returns ID/endpoint/bucket together and omits the public URL for ready private storage, removing only the old public URL. Public provisioning returns `not_ready`; poll `list_cloud_resources` every five seconds up to six times. Stop immediately on timeout/error/failed, or leave incomplete if the sixth attempt remains pending.

Browser transfers use the exact URL/method/headers returned by the server's official presigned-URL route. Never expose the token to Client Components, response JSON, logs, or `NEXT_PUBLIC_*`. Cloud automatically configures upload CORS during storage setup. Do not add template-level CORS get/set, policy diff, approval steps, or pending blockers. Do not probe Cloud management or runtime presign APIs during resource connection.

## Deploy

`AGENTS.md` selects the deployment flow using `COMWIT_EXECUTION_ENV`. Process environment takes precedence over `.env`. If missing or invalid, establish the execution environment first; never guess from NODE_ENV, operating system, or `.env` existence.

- `local`: validate/build, then deploy with the authenticated Comwit CLI `comwit deploy`, exact project/app IDs, and `./dist/brrrd`. Never put tokens in command arguments.
- `sandbox`: after validation, ask the user to **click the Deploy button on screen**. The agent must not call the CLI or publish_project on their behalf.

Hosted deployment refreshes Cloud bindings and reconciles deployment environment state. App validation remains required. Resource setup must synchronize both deployment configuration and the active session environment; saving a binding alone does not prove preview readiness.

## External contract boundaries

Authoritative sources are [OpenAPI](https://api.cloud.comwit.io/openapi.json) and [Comwit Cloud docs](https://docs.cloud.comwit.io/llms-full.txt).

- CG's `/session` template-selector field remains pending. Do not invent its name before it appears in the contract; the intended value is `comwit`.
- If the DB data plane rejects `COMWIT_CLOUD_TOKEN`, stop with `ExternalContractPendingError: database_comwit_token_auth`.
- If the storage presign contract differs, stop with the `storage_presign_contract` pending error.
- If a platform response lacks required IDs/bindings, never guess values or bypass it with Cloud management APIs/manual edits.
