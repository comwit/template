<!-- app-setup:routing -->
## Mobile App Route Groups (app-setup installed)

The shared shell is installed. For mobile details, use this layout and ID-only route contract instead of the default Detail Pages and fetch-and-pass-data examples above.

```text
src/app/(app)/
├── (top-level)/posts/page.tsx     # List tab
└── (detail)/posts/[id]/page.tsx   # The one detail route: static body, server read only in generateMetadata
```

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
import { PostDetailRoute, PostSkeleton } from '@/services/app/page/post-detail'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const post = await api.post.findById(id).catch(() => null) // the only server read
  if (!post) return { title: 'Post', robots: { index: false, follow: false } } // noindex, not notFound()
  return { title: post.title, description: post.excerpt }
}

export default function Page() {
  return (
    <>
      <Suspense fallback={<PostSkeleton />}><PostDetailRoute /></Suspense>
      <Suspense><Connection /></Suspense>
    </>
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

- Always link to the canonical URL `/posts/:id` with a plain `<Link>`; cards run no action before navigating. `generateMetadata` is the only server read and returns a noindex result for a missing item instead of `notFound()`. The view renders not-found UI from `data === null` and JSON-LD from the query data once `isPartial` is `false`. No per-route `error.tsx` for unknown IDs and no `document.title` effect.
- Keep the route file a thin synchronous Server Component: no `await params`, no fetch and no `'use client'` in the body. A server await in the body makes it a dynamic hole, so every in-app navigation waits for a server round trip before the body can paint; `generateMetadata` does not block it.
- Keep temporary sheet routes in `(detail)` too; select the sheet wrapper and transition as described in the UI guide. Reuse the installed route groups and bottom navigation.
- Match tab definitions/order in `layout/app-tabs.ts`. The `/` tab is `(top-level)/page.tsx`; do not retain `(app)/page.tsx`.
- The shell consists of `<AppShell tabs={APP_TABS}>` in `layout/client.tsx` (scrolling, refresh, transitions, back navigation) and `<TabShell>` in `(top-level)/layout.tsx` (tab bar). Both come from installed `@/lib/components/ui/app-shell`. Tab-to-tab navigation preserves the bar; other paths drill into details.

Use Mobile App Detail State in `src/services/state.ai.md` for the seed declaration and SSR prerequisites, and Mobile App Detail UI in `src/services/page.ai.md` for the shared screen.
<!-- /app-setup:routing -->
