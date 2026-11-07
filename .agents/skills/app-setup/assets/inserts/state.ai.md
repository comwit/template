<!-- app-setup:detail-state -->
## Mobile App Detail State (app-setup installed)

For mobile detail screens, this section replaces the general detail hydration/selector-loading examples above. Keep the service-root auth hydration contract unchanged.

**Use one ID-keyed detail resource and let the model declare its seed. The shared detail view always reads `detail.suspend(id)`; nothing writes to the detail cache before navigation.** Do not create a seed model, seed prop, `open(post)` action, list lookup in the view, or separate cached `.load()` and SSR `.suspend()` views.

```ts
// types.ts — PostSummary is the list item; Post adds the detail-only fields.
export type PostState = {
  list: Query<Pageable<PostSummary>, { page: number }>
  detail: Query<Post | null, string, PostSummary>
}

// model.ts
export const post = model<PostState>({
  list: query<Pageable<PostSummary>, { page: number }>({ initialData: emptyPage<PostSummary>(), queryFn: ({ page }) => api.post.findAll({ page, limit: 20 }) }),
  detail: query<Post | null, string, PostSummary>({
    initialData: null,
    queryFn: (id) => api.post.findById(id), // resolves null for a missing post instead of throwing
    seed: (id, { state }: QuerySeedContext<PostState>) => state.list.data.items.find((item) => item.id === id),
  }),
})
```

```tsx
// The same Client Component serves every entry: direct visit and in-app navigation.
function PostDetail({ id }: { id: string }) {
  const post = usePost((state) => ({ detail: state.detail.suspend(id), actions: state.actions }))
  if (!post.detail.data) return <PostNotFound />
  const full = post.detail.isPartial ? null : post.detail.data // null while only the seed is on screen
  return <PostView post={post.detail.data} full={full} />
}
```

- `seed` runs during render and must be pure: it reads only this model's own state (a read-only snapshot) and returns `undefined` when the model holds nothing for the key. Its type is the third generic of `query()`/`Query<>` and may only name fields of the full value with the same types; while `isPartial` is `true`, `data` is `PostSummary & Partial<Post>`. Keep one model per resource: the detail's seed source (its list) lives in the same model, and a screen that needs several resources calls each resource's hook.
- With a seed, `.suspend(id)` does not suspend: it paints the seed (`isPartial: true`, `isFetching: true`, `staleTime` ignored) and the upgrade runs after commit. A full result (fetch, SSR stream, `.set()`, `hydrate()`) always wins over its seed. An upgrade that resolves `null` gives `data === null`, `isPartial: false` → not-found; a rejected upgrade keeps the seed with `isError: true` → keep the content and offer retry. Make `queryFn` resolve `null` for a missing item instead of throwing.
- Actions take the entity id (`like(id)`) and patch the detail only when that id holds a full result; never write detail-only data into a partial key — the seed follows the list row. Do not refetch a list to prepare a detail, use `keepPreviousData` for detail IDs, or `.set()` the detail from a card click.
- Reviews, related items and other independent detail-only resources use separate `.load()` queries, or a child component's `.suspend()` behind its own `<Suspense>`. They must not suspend the core detail selector.
- Local resources (`local()`, `local.query()`, `local.infinite()`) are `.load()`-only (`.restore()` for `local()`); `.suspend()` on them is a type error and throws. `local.query<Data, Arg, Seed, Entity, Meta>()` takes the same `seed`. Keep server-rendered reads as plain `query()`.
- For SSR, keep `StateProvider`'s `useServerInsertedHTML` integration and the root import of `src/lib/server-action/ssr-bridge.ts`. The service API facade executes the query in the server request, and resolved query data streams into the browser cache. Use an explicit `<Suspense>` below `StateProvider`. Data must be JSON-serializable.
- Pass only the ID to the detail view. Do not pass `initialPost` or call `usePost.hydrate()` for mobile details. The existing basic-auth adapter still uses its own hydration contract.

See Mobile App Route Groups in `src/app/.ai.md` for the route file and Mobile App Detail UI in `page.ai.md` for loading/error boundaries.
<!-- /app-setup:detail-state -->
