<!-- app-setup:routing -->
## Mobile App Route Groups (app-setup installed)

The shared shell is installed. For mobile details, use this layout and ID-only route contract instead of the default Detail Pages and fetch-and-pass-data examples above.

```text
src/app/(app)/
├── (top-level)/posts/page.tsx     # List tab
├── (detail)/posts/[id]/page.tsx   # Canonical detail route
└── (.)posts/[id]/page.tsx         # In-app entry point for SEO details only
```

**Use a single canonical route for non-SEO details. Add interception only for SEO-critical details.** Both SEO entry points render the same `PostDetail` Client Component, whose only core resource read is `detail.suspend(id)`.

| Entry | Route behavior | Detail resource behavior |
| --- | --- | --- |
| Direct visit, reload, shared URL, bot | Canonical SEO route handles metadata/404 and passes the ID | `.suspend(id)` resolves during SSR and streams its cache to the browser |
| In-app card navigation | Intercepted route reads ID with `useParams`; no server data read | Card's `actions.open(post)` has filled the cache: render immediately, refetch in the background |
| In-app navigation without cached data | Same intercepted route | Show the detail skeleton while the client query resolves |

```tsx
// Canonical SEO route: (detail)/posts/[id]/page.tsx
import { Suspense } from 'react'
import { PostDetail, PostSkeleton } from '@/services/app/page/post-detail'
type Props = { params: Promise<{ id: string }> }
export default function Page({ params }: Props) {
  return <Suspense fallback={<PostSkeleton />}><Loader params={params} /></Suspense>
}
async function Loader({ params }: Props) {
  const { id } = await params
  // When needed, do a cached server lookup here for notFound(), not for UI props.
  return <PostDetail id={id} />
}
```

```tsx
// Intercepted SEO route: (.)posts/[id]/page.tsx
// Also use this wrapper for the canonical route of client-only, non-SEO details.
import { Suspense } from 'react'
import { PostClientRoute, PostSkeleton } from '@/services/app/page/post-detail'
export default function Page() {
  return <Suspense fallback={<PostSkeleton />}><PostClientRoute /></Suspense>
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
- The shell consists of `<AppShell tabs={APP_TABS}>` in `layout/client.tsx` (scrolling, refresh, transitions, back navigation) and `<TabShell>` in `(top-level)/layout.tsx` (tab bar). Both come from installed `@/lib/components/ui/app-shell`. Tab-to-tab navigation preserves the bar; other paths drill into details.

Use Mobile App Detail State in `src/services/state.ai.md` for cache writes and SSR prerequisites, and Mobile App Detail UI in `src/services/page.ai.md` for the shared screen.
<!-- /app-setup:routing -->
