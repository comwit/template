<!-- app-setup:routing -->
## Mobile App Route Groups (app-setup installed)

The shared shell is installed. For mobile screens, use these route groups, boundaries and the ID-only detail contract instead of the default Detail Pages and fetch-and-pass-data examples above.

```text
src/app/(app)/
├── layout.tsx                     # auth → AppShell (<Ssgoi> + scroller). No boundary.
├── (top-level)/layout.tsx         # <TabShell>: AppGroupLayout { tab body + tab bar }
├── (top-level)/posts/page.tsx     # List tab: <AppScreen bar="tab">
├── (detail)/layout.tsx            # <AppGroupLayout>
├── (detail)/posts/[id]/page.tsx   # The one detail route: <DetailScreen>, static body, server read only in generateMetadata
└── (entry)/layout.tsx             # <AppGroupLayout>: login, onboarding, invite, pay
```

### Transition boundaries

Cache Components keeps visited routes alive in React `<Activity>`, so Back restores their state. SSGOI `SsgoiPageBoundary` is never keyed: React hiding a route's top-most host node is the OUT, showing it again is the IN. Only the installed components create it:

- **Every page** renders `AppScreen` or `DetailScreen` (`@/lib/components/ui/app-screen`) as its top-most element, in the route file or in the page component it renders. `Suspense` and fragments may sit above it, a wrapper `<div>` may not. Put the page's `Suspense` inside the screen.
- **Every group or persistent layout** renders `AppGroupLayout` (`@/lib/components/ui/app-group-layout`) as its top-most element, with persistent chrome inside. `(top-level)` uses `TabShell`, which is that boundary plus the tab bar. A workspace layout such as `projects/[id]/layout.tsx` wraps the whole workspace once; its sub-pages render no screen and are listed as exceptions.
- **`(app)/layout.tsx` has no boundary**, and nothing outside `(app)` uses SSGOI. Only `src/lib/components/ui` renders `<Ssgoi>`/`SsgoiPageBoundary`; only it and `src/services/app` import `@ssgoi/react`. Never add `SsgoiLayoutBoundary` or a keyed route boundary.
- **`@modal` intercept pages are not wrapped.** Add the slot to `(top-level)/layout.tsx` as a sibling, `<><TabShell>{children}</TabShell>{modal}</>`, with `@modal/default.tsx` returning `null`. Intercepts are `@modal` overlays only; details never get a full-page `(.)` intercept route.
- A desktop app adds `(shell)/layout.tsx` (AppGroupLayout with the desktop header inside) above `(top-level)` and `(detail)`; `(entry)` stays outside it.

`tests/app-boundaries.test.mjs` (run by `pnpm run validate`) enforces this. When a page legitimately renders no screen (redirect only, `@modal` intercept, workspace pane) or a layout only passes children through (auth guard), add it to that test's exception list with the reason.

### Detail entry points

**One canonical route per detail.** The route body is static: no server data read and no `await params` in it. The `PostDetail` Client Component reads the ID with `useParams` and makes one `detail.suspend(id)` read; the model's `seed` (see `state.ai.md`) decides what that read paints.

| Entry | Route behavior | Detail resource behavior |
| --- | --- | --- |
| Direct visit, reload, shared URL, bot | `generateMetadata` reads the item on the server (title/OG, noindex when missing); the body streams | `.suspend(id)` suspends, resolves during SSR and streams its cache to the browser |
| In-app navigation from a list that holds the item | The static shell commits at once; no server round trip for the body | `seed` paints the list item immediately (`isPartial: true`); the full detail upgrades in the background |
| In-app navigation without list data | Same static shell | `.suspend(id)` shows the detail skeleton until the client query resolves |

```tsx
// (detail)/posts/[id]/page.tsx — the only detail route
import type { Metadata } from 'next'
import { connection } from 'next/server'
import { Suspense } from 'react'
import { DetailScreen } from '@/lib/components/ui/app-screen'
import { PostDetailRoute, PostSkeleton } from '@/services/app/page/post-detail'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const post = await api.post.findById(id).catch(() => null) // the only server read
  if (!post) return { title: 'Post', robots: { index: false, follow: false } } // noindex for a missing item
  return { title: post.title, description: post.excerpt }
}

export default function Page() {
  return (
    <DetailScreen fallback="/posts">
      <Suspense fallback={<PostSkeleton />}><PostDetailRoute /></Suspense>
      <Suspense><Connection /></Suspense>
    </DetailScreen>
  )
}

/** Dynamic marker: metadata is request-time while the body stays a static shell. */
async function Connection() {
  await connection()
  return null
}
```

```tsx
// In the service page layer's 'use client' module, not the app-router file:
export function PostDetailRoute() {
  const { id } = useParams<{ id: string }>()
  return <PostDetail id={id} />
}
```

- Link to the canonical URL `/posts/:id` with `<Link>`. `generateMetadata` is the only server read and returns a noindex result for a missing item. The view renders not-found UI from `data === null` and JSON-LD from the query data once `isPartial` is `false`.
- Keep the route file a thin synchronous Server Component: no `await params`, no fetch and no `'use client'` in the body. A server await in the body makes it a dynamic hole, so every in-app navigation waits for a server round trip before the body can paint; `generateMetadata` does not block it. `DetailScreen` is the route's top-most element and the page's `Suspense` sits inside it, so the loading state keeps the app bar and back button.
- Keep temporary sheet routes in `(detail)` too; select the sheet wrapper and transition as described in the UI guide. Reuse the installed route groups and bottom navigation.
- Match tab definitions/order in `layout/app-tabs.ts`. The `/` tab is `(top-level)/page.tsx`; do not retain `(app)/page.tsx`.
- The shell consists of `<AppShell tabs={APP_TABS}>` in `layout/client.tsx` (`<Ssgoi>`, scrolling, refresh, back navigation; no boundary) and `<TabShell>` in `(top-level)/layout.tsx` (group boundary and tab bar). Both come from installed `@/lib/components/ui/app-shell`. Tab-to-tab navigation preserves the bar; other paths drill into details.

Use Mobile App Detail State in `src/services/state.ai.md` for the seed declaration and SSR prerequisites, and Mobile App Detail UI in `src/services/page.ai.md` for the shared screen.
<!-- /app-setup:routing -->
