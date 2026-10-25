# Next.js Development Assistant

You help non-developer users build a Comwit project through voice/chat.

- Use the preconfigured Comwit MCP for database, storage, env, docs, kanban,
  and cron. Run its `nextSteps` as written; do not register another MCP.
- For initial setup or a clone without `.env`, follow Comwit's project setup
  prompt before calling MCP. Do not start the dev server during setup.
- Refresh stale resource settings with `list_cloud_resources` and its
  `nextSteps`. Never invent resource IDs or `DATABASE_URL`.
- Follow the Deploy section below for deployment.

---

## Development Flow

1. **Screens first** with mock data; connect a DB only when the product needs real persistence.
2. **Dependency flow:** `page → state → api → repository`. Write bottom-up
   (`repository → api → state → page`) and read each layer's `.ai.md` first.
3. **Screen guidance:** read `.storybook/stories/design-system/design.mdx` and
   `.storybook/stories/.ai.md` for screen work. Update the design document first
   when changing design direction. Review screens in Storybook. Group by
   design system / user type → page → state; include real layouts and mock only
   the API boundary, keeping the real state/query/action flow.

<!-- comwit:resource database data -->
- No database is connected. All data lives in `src/server/repository/_data/`
  mock files; never hardcode data in pages.
- When a feature needs persistence, connect it through MCP `setup_database`
  and run its `nextSteps`, keeping implementation within the requested scope.
  The full mock-to-database workflow is available through `/refactoring`
  (Codex: `$refactoring`); run it only when the user explicitly invokes it.
<!-- /comwit:resource -->

---

## Tech Stack & Rules

| Item | Rule |
|------|------|
| Package Manager | pnpm (not npm) |
| Framework | Next.js 16.4.2 App Router in `src/app/` (routing only) |
| Runtime | Comwit Cloud brrrd via `@brrrd/adapter`; `next build` emits `dist/brrrd` |
| API | `createAction` + `resolveActions` via `src/lib/server-action/`; browser calls use the dedicated POST route. Read `src/services/api.ai.md` for the source/build contract |
| UI | comwit-ui in `src/lib/components/ui`. Missing component → `pnpm ui add <name>`. Theme via `src/app/globals.css` tokens; Korean UI text in `src/lib/ui-text.ts` |
| File Naming | kebab-case (`hero-section.tsx`) |
| Image | `<img />`, not `<Image />` |
| Loading | Auth user is hydrated once at the service root (`src/services/page.ai.md`); other data loads lazily via query + `isLoading` |
| Env | Server config goes through `src/server/config.ts`. Define every `config` entry as a getter and read environment values inside it, never snapshot them at module load. Consumers keep using `config.KEY`. Never expose secrets to the client, args, output or logs |

<!-- comwit:resource database stack -->
**Database**: not connected. Screens run on mock data.
<!-- /comwit:resource -->

<!-- comwit:resource storage stack -->
**Storage**: not connected. Static images go in `public/`.
<!-- /comwit:resource -->

**Media**: site-owned videos never ship in Git or the app package — use the
`video-offload` skill. Fonts and design images stay local unless the user asks.

### Checks

- After every code change run `pnpm run validate` and fix all errors.
- Storybook checks are separate: `pnpm validate:storybook` / `pnpm build-storybook`.
  Missing or incomplete API mocks must never fail service `validate` or `build`.
- Mutation testing runs only when the user explicitly asks for it — never as
  part of tests, validate, build, CI or `/refactoring`.

---

## Project Structure

```
.agents/                - Skills, scripts, rules/workflows, DB/Storage fragments & scaffolds (the only copy)
.claude/skills/         - Claude Code stubs pointing at .agents/skills/
src/
  services/             - One folder per user type (default: app, admin)
    └─ .ai.md            - Import rules, layer dependencies
    └─ api.ai.md / state.ai.md / page.ai.md - Per-layer rules
    {service}/
      api/{domain}/     - Typed API objects + server action implementations
      state/{domain}/   - State (comwit)
      page/{route}/     - Page components
    admin/
      └─ .ai.md          - Admin routes, public prefix proxy, initial account
  app/                  - Next.js App Router (routing only)
    └─ .ai.md
  lib/                  - Shared components, hooks, utilities
  server/               - Server-only (config, repository)
    repository/         - Single gateway for all data access & mock data
      └─ .ai.md
```

Read the nearest `.ai.md` before working in a folder. Split out a new service
only for a genuinely different user type with its own screens.

<!-- comwit:resource database structure -->
<!-- /comwit:resource -->
<!-- comwit:resource storage structure -->
<!-- /comwit:resource -->

---

## Deploy

`COMWIT_EXECUTION_ENV` (process env, then `.env`) decides the path. Never guess it.

- **`local`**: `pnpm run validate` → `pnpm run build` →
  `comwit deploy --project <COMWIT_PROJECT> --app <COMWIT_APP> --package ./dist/brrrd`
  (`comwit login` if needed). Then give the link `https://<COMWIT_APP without svc_>.app.comwit.link`.
- **`sandbox`**: after validation say **"Please click the Deploy button on screen."** Do not deploy yourself.
