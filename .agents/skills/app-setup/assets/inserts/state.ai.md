<!-- app-setup:detail-state -->
## Mobile App Detail State (app-setup installed)

For mobile detail screens, this section replaces the general detail hydration/selector-loading examples above. Keep the service-root auth hydration contract unchanged.

**Use one ID-keyed detail resource. Before card navigation, put the known resource data into that query; the shared detail view always reads `detail.suspend(id)`.** Do not create a seed model, separate seed prop, list-lookup fallback, or separate cached `.load()` and SSR `.suspend()` views.

```ts
// model.ts — Post is the resource type shared by list and detail APIs.
detail: query<Post | null, string>({
  initialData: null,
  queryFn: (id) => api.post.findById(id),
})

// Inside the domain action class; add open(post: Post): void to its action type.
open(post: Post) {
  this.model.detail.set(post, { arg: post.id })
}
```

```tsx
// A card uses a normal Link and the complete actions collection from its selector.
const postState = usePost((state) => ({ actions: state.actions }))
<Link href={`/posts/${post.id}`} onClick={() => postState.actions.open(post)}>
  <PostCardContent post={post} />
</Link>

// The same Client Component is used by canonical and intercepted routes.
function PostDetail({ id }: { id: string }) {
  const post = usePost((state) => ({ detail: state.detail.suspend(id) }))
  if (post.detail.isError) return <PostError error={post.detail.error} />
  if (!post.detail.data) return <PostNotFound />
  return <PostView post={post.detail.data} />
}
```

- Prefer one resource shape/presenter for list and detail, as in the storefront's product resource. A list item fills the detail cache directly. If a list genuinely has only some fields of that same resource, model missing fields explicitly in the resource type and render their loading state from that resource; do not cast a summary to a complete detail or introduce another seed model. Preserve already-loaded fields when applying a partial item to the same ID; `.set()` replaces data rather than merging it automatically.
- A populated cache entry makes `.suspend(id)` return immediately; with the template's `staleTime: 0`, it refetches after commit while keeping content visible. An empty cache suspends until the query resolves. `isFetching` is background progress, not a reason to blank existing content. Do not use `keepPreviousData` for detail IDs or refetch a list to prepare a detail.
- Reviews, related items and other independent detail-only resources use separate `.load()` queries, or a child component's `.suspend()` behind its own `<Suspense>`. They must not suspend the core detail selector.
- Cache writes belong in the navigation action, never during render or in a mount effect. Key writes and reads by the same ID and respect user scope; clear private caches when the account changes.
- For SSR, keep `StateProvider`'s `useServerInsertedHTML` integration and the root import of `src/lib/server-action/ssr-bridge.ts`. The service API facade executes the query in the server request, and resolved query data streams into the browser cache. Use an explicit `<Suspense>` below `StateProvider` and a request-time boundary such as the canonical route's `await params`. Data must be JSON-serializable.
- Pass only the ID from the canonical route to the detail view. Do not pass `initialPost` or call `usePost.hydrate()` for mobile details. The existing basic-auth adapter still uses its own hydration contract.

See Mobile App Route Groups in `src/app/.ai.md` for entry points and Mobile App Detail UI in `page.ai.md` for loading/error boundaries.
<!-- /app-setup:detail-state -->
