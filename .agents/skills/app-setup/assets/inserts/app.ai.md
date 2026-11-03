<!-- app-setup:routing -->
## Mobile App Route Groups (app-setup installed)

The shared shell is installed. For mobile screens, use these route groups, boundaries and the ID-only detail contract instead of the default Detail Pages and fetch-and-pass-data examples above.

```text
src/app/(app)/
├── layout.tsx                       # auth → AppShell (<Ssgoi> + scroller). No boundary.
├── (top-level)/layout.tsx           # <TabShell>: AppGroupLayout { tab body + tab bar }
├── (top-level)/posts/page.tsx       # List tab: <AppScreen bar="tab">
├── (detail)/layout.tsx              # <AppGroupLayout>
├── (detail)/posts/[id]/page.tsx     # Canonical detail route: <DetailScreen>
├── (detail)/(.)posts/[id]/page.tsx  # In-app entry point for SEO details only: <DetailScreen>
└── (entry)/layout.tsx               # <AppGroupLayout>: login, onboarding, invite, pay
```

### Transition boundaries

Cache Components keeps visited routes alive in React `<Activity>`, so Back restores their state. SSGOI `SsgoiPageBoundary` is never keyed: React hiding a route's top-most host node is the OUT, showing it again is the IN. Only the installed components create it:

- **Every page** renders `AppScreen` or `DetailScreen` (`@/lib/components/ui/app-screen`) as its top-most element, in the route file or in the page component it renders. `Suspense` and fragments may sit above it, a wrapper `<div>` may not. Put the page's `Suspense` inside the screen.
- **Every group or persistent layout** renders `AppGroupLayout` (`@/lib/components/ui/app-group-layout`) as its top-most element, with persistent chrome inside. `(top-level)` uses `TabShell`, which is that boundary plus the tab bar. A workspace layout such as `projects/[id]/layout.tsx` wraps the whole workspace once; its sub-pages render no screen and are listed as exceptions.
- **`(app)/layout.tsx` has no boundary**, and nothing outside `(app)` uses SSGOI. Only `src/lib/components/ui` renders `<Ssgoi>`/`SsgoiPageBoundary`; only it and `src/services/app` import `@ssgoi/react`. Never add `SsgoiLayoutBoundary` or a keyed route boundary.
- **`@modal` intercept pages are not wrapped.** Add the slot to `(top-level)/layout.tsx` as a sibling, `<><TabShell>{children}</TabShell>{modal}</>`, with `@modal/default.tsx` returning `null`. Full-page `(.)` intercepts in `(detail)` are ordinary pages and render `DetailScreen`.
- A desktop app adds `(shell)/layout.tsx` (AppGroupLayout with the desktop header inside) above `(top-level)` and `(detail)`; `(entry)` stays outside it.

`tests/app-boundaries.test.mjs` (run by `pnpm run validate`) enforces this. When a page legitimately renders no screen (redirect only, `@modal` intercept, workspace pane) or a layout only passes children through (auth guard), add it to that test's exception list with the reason.

### Detail entry points

**Use a single canonical route for non-SEO details. Add interception only for SEO-critical details.** Both SEO entry points render the same `PostDetail` Client Component, whose only core resource read is `detail.suspend(id)`.

| Entry | Route behavior | Detail resource behavior |
| --- | --- | --- |
| Direct visit, reload, shared URL, bot | Canonical SEO route handles metadata/404 and passes the ID | `.suspend(id)` resolves during SSR and streams its cache to the browser |
| In-app card navigation | Intercepted route reads ID with `useParams`; no server data read | Card's `actions.open(post)` has filled the cache: render immediately, refetch in the background |
| In-app navigation without cached data | Same intercepted route | Show the detail skeleton while the client query resolves |

```tsx
// Canonical SEO route: (detail)/posts/[id]/page.tsx
import { Suspense } from 'react'
import { DetailScreen } from '@/lib/components/ui/app-screen'
import { PostDetail, PostSkeleton } from '@/services/app/page/post-detail'
type Props = { params: Promise<{ id: string }> }
export default function Page({ params }: Props) {
  return (
    <DetailScreen fallback="/posts">
      <Suspense fallback={<PostSkeleton />}><Loader params={params} /></Suspense>
    </DetailScreen>
  )
}
async function Loader({ params }: Props) {
  const { id } = await params
  // When needed, do a cached server lookup here for notFound(), not for UI props.
  return <PostDetail id={id} />
}
```

```tsx
// Intercepted SEO route: (detail)/(.)posts/[id]/page.tsx
// Also use this wrapper for the canonical route of client-only, non-SEO details.
import { Suspense } from 'react'
import { DetailScreen } from '@/lib/components/ui/app-screen'
import { PostClientRoute, PostSkeleton } from '@/services/app/page/post-detail'
export default function Page() {
  return (
    <DetailScreen fallback="/posts">
      <Suspense fallback={<PostSkeleton />}><PostClientRoute /></Suspense>
    </DetailScreen>
  )
}

// In the service page layer's 'use client' module, not the app-router file:
function PostClientRoute() {
  const { id } = useParams<{ id: string }>()
  return <PostDetail id={id} />
}
```

- Always link to the canonical URL `/posts/:id`. Place `generateMetadata`, JSON-LD and server `notFound()` decisions only in the canonical SEO route. Share its metadata/404 lookup with React `cache()` where needed; the view reads its resource through `.suspend()`, not server data props.
- Keep the intercepted wrapper synchronous: no server lookup, `await params`, or metadata. Read the ID with `useParams` in the service client component under Suspense so the wrapper can be prefetched as an app shell. Keep app-router files as thin Server Component wrappers.
- Provide an error boundary for query failures on both entry paths; map confirmed missing/forbidden resources according to domain policy. Use a real detail skeleton as each Suspense fallback, never `null`. Update the document title from the resource on intercepted navigation, which has no route metadata.
- Keep temporary sheet routes in `(detail)` too; select the sheet wrapper and transition as described in the UI guide. Reuse the installed route groups and bottom navigation.
- Match tab definitions/order in `layout/app-tabs.ts`. The `/` tab is `(top-level)/page.tsx`; do not retain `(app)/page.tsx`.
- The shell consists of `<AppShell tabs={APP_TABS}>` in `layout/client.tsx` (`<Ssgoi>`, scrolling, refresh, back navigation; no boundary) and `<TabShell>` in `(top-level)/layout.tsx` (group boundary and tab bar). Both come from installed `@/lib/components/ui/app-shell`. Tab-to-tab navigation preserves the bar; other paths drill into details.

Use Mobile App Detail State in `src/services/state.ai.md` for cache writes and SSR prerequisites, and Mobile App Detail UI in `src/services/page.ai.md` for the shared screen.
<!-- /app-setup:routing -->
