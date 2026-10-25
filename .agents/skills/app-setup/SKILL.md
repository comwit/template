---
name: app-setup
description: One-time mobile app setup with bottom tabs, fullscreen details, app bars with history-aware back/fallback, Ssgoi, viewport and PWA installation/banner. Leaves .ai.md guidance and removes itself. Use for requests to build a mobile app, add bottom navigation, or create tab screens before the first app screen; not ordinary websites or template maintenance.
---

# app-setup

Set up an app-like product once, before its first screen. The CLI installs the
repeatable shell; the AI implements the requested routes, screens and domain data.
After cleanup, `src/app/.ai.md`, `src/services/page.ai.md`, and
`src/services/state.ai.md` retain the app conventions. Do not install these
conventions for ordinary web pages or run setup in the source template checkout.

## Choose tabs

Use the user's product brief to choose 2–5 tabs (href, label, icon name from `@comwit/ui/icons` without the `Icon` suffix, e.g. House, Search, UserRound).
Ask only if missing product information prevents a reasonable choice.

Read `src/app/.ai.md`, `src/services/page.ai.md`, `src/services/state.ai.md`,
and the existing app layout/routes. All shell UI (AppShell/TabShell, AppScreen,
AppBar, BottomNav/TabBar, Glass, PageTransition/RouteBoundary, PullToRefresh,
BottomSheet) is comwit-ui source installed in `src/lib/components/ui` for the
detected router; the scroller, scroll chrome, refresh gesture and back depth are
`@comwit/ui` primitives. This skill only places them and lists the tabs.
Transition rules use the SSGOI config shape (https://ssgoi.dev/llms.txt) through
`appTransitions`. Older projects need `comwit.json`, `@comwit/ui@0.6.0`,
`comwit-ui@0.7.0` (dev), `@ssgoi/react@7.4.1` and `@comwit/state@2.5.0` or newer;
install missing ones with `--save-exact` first.

## 1. CLI: install the mechanical shell

Write the chosen tabs to `.agents/state/app-setup-tabs.json`, for example:

```json
[
  { "href": "/", "label": "Home", "icon": "House" },
  { "href": "/search", "label": "Search", "icon": "Search" }
]
```

Write `.agents/state/app-setup-pwa.json` from the product brief, for example:

```json
{ "name": "Gather", "shortName": "Gather", "description": "Collect memories together", "backgroundColor": "#ffffff", "themeColor": "#ffffff" }
```

Optional `icon` is an existing local logo path (PNG/SVG/etc.); the CLI uses Next's
installed sharp to produce 192/512/maskable/Apple PNGs. Without it, neutral icons
are installed; replace them when branding is available without blocking setup.
`start_url` is the first tab's href. `--pwa` can be omitted for an initial App
placeholder. From the project root (Node; Windows/macOS/Linux):

```bash
node .agents/skills/app-setup/scripts/setup.mjs --tabs .agents/state/app-setup-tabs.json --pwa .agents/state/app-setup-pwa.json --dry-run
node .agents/skills/app-setup/scripts/setup.mjs --tabs .agents/state/app-setup-tabs.json --pwa .agents/state/app-setup-pwa.json
```

The CLI first runs the project's `comwit-ui add app-shell app-screen
bottom-sheet button` (router-detected variants; existing files are kept,
dependencies are not touched), then places them: `<AppShell tabs={APP_TABS}
top={<PwaInstallBanner />}>` around the routed UI in `layout/client.tsx`,
`<TabShell>` in the `(top-level)` layout, an empty `(detail)` layout, and PWA
setup. It writes `app-tabs.ts`, preserves auth hydration, moves an existing home
into `(top-level)` when `/` is a tab, and inserts the three guides below.
Boundary keys and transitions come from the tab list: tab paths keep the tab
bar and slide sideways, everything else drills in. Product pages and domain
queries are implemented in the next step. Page transitions lock wheel, touchmove
and page-scroll key input on the app's `<main>` scroller while they run. Keep
this unless the app manages transition input itself; then pass
`transitions={appTransitions(APP_TAB_PATHS, { scrollLock: false })}` to
`AppShell` and provide equivalent behavior.

`--dry-run` reports the plan without writes; reruns skip identical work.
Dependencies must already be installed. The known unchanged template manifest is
upgraded; custom files stay in the JSON `review` list. Resolve every review
item before completion, even when the command exits 0. The CLI does not remove
the skill or mark setup complete.

## 2. Implement the product using the installed guides

| Guide | Owns |
| --- | --- |
| `src/app/.ai.md` → Mobile App Route Groups ([source](assets/inserts/app.ai.md)) | Canonical SSR / intercepted client entry points sharing one detail view |
| `src/services/page.ai.md` → Mobile App Detail UI ([source](assets/inserts/page.ai.md)) | Immediate cached content, empty-cache Suspense, and independent section loading |
| `src/services/state.ai.md` → Mobile App Detail State ([source](assets/inserts/state.ai.md)) | Card action fills the same detail resource; one `.suspend(id)` read for every entry |

For mobile details these sections supersede the general detail hydration examples;
keep the service-root auth hydration contract. Verify the existing StateProvider
streaming integration and root SSR bridge import before using server `.suspend()`.
Do not create a separate seed model/prop or a detail hydration adapter.

Follow these guides to implement the requested tabs and detail flows with the
product's domain data (mock repositories are fine). Keep each decision in its
own guide; customize its example names to the app. Reuse the installed shell.
**Installing the shell or writing guides alone is not completion: the requested
routes, queries and shared detail UI must be connected.**

## 3. Validate, leave context, remove the skill

Resolve CLI review items and run `pnpm run validate`. After route moves, regenerate
stale types with `pnpm exec next typegen` if needed. Check the implemented flow:

- A card action fills the ID-keyed detail resource before navigation. With the
  detail API held pending, cached content still renders immediately; refetch does
  not blank it. Missing fields and independent sections show only local loading.
- An empty cache shows the route skeleton until the detail query resolves.
  Changing IDs never flashes another resource; missing/forbidden responses hide
  cached content, and transient failures offer retry.
- Client-only details use one route. SEO details use a canonical SSR route and
  a server-read-free intercepted route, both rendering the same `.suspend(id)`
  view. Check direct visit/reload, cached card navigation, and uncached in-app
  navigation; SSR data is streamed without a manual detail hydration adapter.
- Tabs retain BottomNav; fullscreen details hide it. Verify the app-bar back
  button after card navigation, browser back/forward, and direct-entry/reload
  parent fallback. Loading/error screens keep a usable back button. Check
  detail reveal, sheet close/pinned behavior, and any floating back button.

Run `pnpm run sw:build` and verify manifest/icons/metadata. Browser verification
belongs to the user under project rules: report untested route navigation,
scroll chrome, menu focus and PWA installation behavior. Do not deploy for testing.

Ensure the three inserted guides reflect the actual setup, record successful
validation, then run:

```bash
node .agents/scripts/cleanup-skill.mjs app-setup
```

Cleanup removes `.agents/skills/app-setup/` and its `.claude/skills/app-setup/` stub together; never delete only one of them. Leave installed files/guides and continue building the
remaining product features. Do not recreate the skill.
