---
name: app-setup
description: One-time mobile app setup with bottom tabs, fullscreen details, app bars with history-aware back/fallback, SSGOI page-boundary transitions that keep Back state under Cache Components, viewport and PWA installation/banner. Leaves .ai.md guidance and removes itself. Use for requests to build a mobile app, add bottom navigation, or create tab screens before the first app screen; not ordinary websites or template maintenance.
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
and the existing app layout/routes. All shell UI (AppShell/TabShell,
AppGroupLayout, AppScreen/DetailScreen, AppBar, BottomNav/TabBar, Glass,
PullToRefresh, BottomSheet) is comwit-ui source installed in
`src/lib/components/ui` for the detected router; the scroller, scroll chrome,
refresh gesture and back depth are `@comwit/ui` primitives. This skill only
places them and lists the tabs. Transition rules use the SSGOI config shape
(https://ssgoi.dev/llms.txt) through `appTransitions`. Older projects need
`comwit.json`, `@comwit/ui@0.6.0`, `comwit-ui@0.7.1` (dev),
`@ssgoi/react@7.5.0-beta.2` and `@comwit/state@2.5.0` or newer; install missing
ones with `--save-exact` first. The CLI refuses older versions.

## Route structure and transition boundaries

This is the structure proven in the Comwit app. Comwit also serves desktop, so
it adds a `(shell)` group for desktop chrome; a mobile-only app skips it.

```text
src/app/
├── layout.tsx              # root: global providers only, no SSGOI
├── (app)/
│   ├── layout.tsx          # service layout: auth → AppShell (<Ssgoi config framework> + scroller). No boundary.
│   ├── (shell)/layout.tsx  # optional, desktop apps: AppGroupLayout with the desktop header inside
│   ├── (top-level)/        # tab screens: TabShell = AppGroupLayout { tab body + tab bar }
│   │   └── @modal/         # optional modal intercepts: a sibling of TabShell, never wrapped
│   ├── (detail)/           # back-stack screens without the tab bar: AppGroupLayout
│   └── (entry)/            # login, onboarding, invite, pay…: AppGroupLayout, no app chrome
└── (admin)/ (site)/ …      # other services: no SSGOI at all
```

With `(shell)`, `(top-level)` and `(detail)` move under it; `(entry)` stays
outside so standalone screens leave the desktop header behind. Nested
persistent layouts (a workspace such as `projects/[id]/layout.tsx` with its own
tabs or sidebar) render one AppGroupLayout around the whole workspace, and
their sub-pages render no boundary of their own.

Rules:

- **SSGOI only under `(app)`.** One `<Ssgoi>`, rendered by `AppShell` inside
  the service layout's client component, next to the user hydration it already
  holds. The `(app)` level renders no transition boundary: a boundary there
  would trap every move between groups inside it.
- **Every group or persistent layout renders `AppGroupLayout`** as its
  top-most element. Persistent chrome (tab bar, desktop header) goes inside it
  so it leaves with the group.
- **Every page renders `AppScreen` (or `DetailScreen`)** as its top-most
  element: the route file or the page component it renders. `Suspense`,
  fragments and sibling scripts may sit above it; a wrapper `<div>` may not.
  Put the page's `Suspense` inside the screen so loading keeps the app bar and
  back button. `(entry)` screens that own their top edge use
  `<AppScreen bar={false}>`: the boundary without an app bar.
- **`@modal` intercept pages are not wrapped.** The `{modal}` slot renders
  outside the group boundary and animates by itself. Full-page `(.)`
  intercepts in `(detail)` are ordinary pages and do render `DetailScreen`.
- Only the installed shell components render `<Ssgoi>` or
  `SsgoiPageBoundary`, and nothing outside `src/services/app` and
  `src/lib/components/ui` imports `@ssgoi/react`. Never add
  `SsgoiLayoutBoundary`, `config.layouts` or a keyed route boundary next to
  them.

Why: the template enables Next.js Cache Components, which keeps visited routes
alive inside React `<Activity>` instead of unmounting them, so Back restores
their state (scroll, inputs, loaded lists). A keyed boundary remounts the page
and throws that state away. `SsgoiPageBoundary` (inside AppGroupLayout and
AppScreen) is never keyed: React hiding the route with `display: none
!important` on its top-most host node is the OUT, showing it again is the IN.
That is why the boundary must be the top-most node. Tab → tab swaps the page
and keeps the group and tab bar; tab → detail moves the whole group, bar
included; detail → detail swaps the page; Back reveals the kept route.

`AppShell` gives `<Ssgoi>` (through `PageTransition`) the router adapter
`routeFramework` from the installed `@/lib/components/ui/route-boundary`. It is
the Next.js `useRoute` snippet from the `@ssgoi/react` README, below verbatim.
Page boundaries use `pathname` and ignore `renderedPath`; keep the same
module-scope object anyway if you write your own shell:

```ts
"use client";

import { usePathname, useSelectedLayoutSegments } from "next/navigation";
import { type SsgoiFramework } from "@ssgoi/react";

const INTERCEPTION_PREFIX = /^(?:\(\.\.\.\)|\(\.\.\)|\(\.\))+/;

const framework: SsgoiFramework = {
  useRoute: () => {
    const pathname = usePathname();
    // The page the children slot renders. During a soft intercept it is still
    // the background page, so no background boundary moves.
    const segments = useSelectedLayoutSegments();
    if (pathname == null) return null;
    const renderedPath = `/${segments
      .filter((segment) => !(segment.startsWith("(") && segment.endsWith(")")))
      .map((segment) => segment.replace(INTERCEPTION_PREFIX, ""))
      .filter(Boolean)
      .join("/")}`;
    return { pathname, renderedPath };
  },
};
```

Known beta limitation (`@ssgoi/react` 7.5.0-beta): while a soft-intercepted
`@modal` is open, visible background boundaries take the modal's URL as their
id, so a transition rule keyed on the background path may not match.

**Enforce it with a test.** The CLI installs `tests/app-boundaries.test.mjs`
and wires it into `pnpm run validate` (`test:app`). It follows each `(app)`
route file's default export through its JSX and imports with the TypeScript
AST: pages must reach `AppScreen`/`DetailScreen`, layouts `AppGroupLayout`,
the `(app)` layout neither, boundaries come only from
`src/lib/components/ui`, and SSGOI stays inside the app service. Exceptions
live in explicit, commented lists (redirect-only pages, `@modal` intercepts,
workspace panes, pass-through layouts such as an auth guard). The lists must be exact both ways; never silence a failure by
wrapping a page in a bare `div`.

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
installed sharp to produce 192/512/maskable/Apple PNGs. Without it, the bundled
Comwit official blue symbol is installed. These four PNGs are unchanged copies
of the matching root paths in [comwit.io’s manifest](https://comwit.io/manifest.webmanifest)
(retrieved 2026-10-25): `icon-192.png`, `icon-512.png`, `icon-maskable.png`, and
`apple-icon.png`. The maskable and Apple variants include an opaque white
background and platform padding. Supply `icon` when the product has its own logo;
do not redraw or substitute a generic mark for the default.
`start_url` is the first tab's href. `--pwa` can be omitted for an initial App
placeholder. From the project root (Node; Windows/macOS/Linux):

```bash
node .agents/skills/app-setup/scripts/setup.mjs --tabs .agents/state/app-setup-tabs.json --pwa .agents/state/app-setup-pwa.json --dry-run
node .agents/skills/app-setup/scripts/setup.mjs --tabs .agents/state/app-setup-tabs.json --pwa .agents/state/app-setup-pwa.json
```

The CLI first runs the project's `comwit-ui add app-shell app-group-layout
app-screen bottom-sheet button` (router-detected variants; existing files are
kept, dependencies are not touched), then places them: `<AppShell
tabs={APP_TABS} top={<PwaInstallBanner />}>` around the routed UI in
`layout/client.tsx`, `<TabShell>` (AppGroupLayout + tab bar) in the
`(top-level)` layout, `<AppGroupLayout>` in the `(detail)` and `(entry)`
layouts, the boundary test with its `test:app` validate step, and PWA setup. It
writes `app-tabs.ts`, preserves auth hydration, moves an existing home into
`(top-level)` when `/` is a tab, and inserts the three guides below. Transitions
come from the tab list: tab paths slide sideways, everything else drills in.
Product pages and domain queries are implemented in the next step; each page
renders `AppScreen`/`DetailScreen`. Page transitions lock wheel, touchmove
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
| `src/app/.ai.md` → Mobile App Route Groups ([source](assets/inserts/app.ai.md)) | Route groups, page/group boundaries, canonical SSR / intercepted client entry points sharing one detail view |
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

Resolve CLI review items and run `pnpm run validate` (typecheck, lint and the
boundary test). After route moves, regenerate stale types with
`pnpm exec next typegen` if needed. Check the implemented flow:

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
- Tab → tab keeps the tab bar still; tab → detail moves the tab bar out with
  the group. Back returns to the kept screen with its scroll and state intact
  (no refetch flash, no reset form).
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
