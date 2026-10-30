# State Layer — template rules

How this template writes `@comwit/state`. Library options and every API:
https://library.comwit.io/state/llms.txt

## Location

```text
services/{service}/state/{domain}/
  types.ts → model.ts → actions/{load,crud,interact}.ts → index.ts
```

- Write in that order, `types.ts` first.
- Keep a domain's list, detail, stats and filters in one model.
- Dependency flow: `page → state → api → repository`.

## Types and model

- Type remote data as `Query<T, Arg>`; plain fields are client state.
- Use `keepPreviousData` only on paginated queries.

```ts
export type ProductState = {
  products: Query<Pageable<Product>, { page: number }>
  detail: Query<Product | null, string>
  …
}

products: query({ initialData: emptyPage(), queryFn: ({ page }) => api.product.findAll({ page, limit: 20 }), placeholderData: keepPreviousData }),
```

## Read queries

- Read screen data in the selector with `.suspend(arg)`.
- Use `.load(arg)` only for client-only reads with their own inline loading UI.
- Select a query without a method only when an action owns loading.
- Always pass a selector, and select actions whole as `actions: s.actions`.

```tsx
const product = useProduct((s) => ({ detail: s.detail.suspend(id), actions: s.actions }))
// ✗ useEffect(() => actions.load(), []) · ✗ s.actions.like
```

## Screens: `.suspend()` inside `<Suspense>`

- Put the reading Client Component inside a `<Suspense>` whose fallback is a skeleton shaped like it.
- Keep titles and fixed copy outside the boundary; only data-driven parts suspend.
- Do not add Server Component loaders, route adapters or extra folders — `StateProvider` streams SSR results.
- Handle a failed first load in `error.tsx`; decide 404 with `notFound()` in the Server Component.

```tsx
<Products>                                  {/* client shell: <h1>, copy */}
  <Suspense fallback={<ProductListSkeleton />}>
    <ProductList />                         {/* s.products.suspend(…) */}
  </Suspense>
</Products>
// ✗ fallback={null} — only the service-root auth boundary
```

Pages under the service layout SSR this on direct visits, and in-app revisits paint from cache.

## Pagination and filters

- Change the query arg inside a transition and dim the list with `isPending`.
- Keep the arg in `useState` to hold the old list; keep it in the model to keep it across navigation.

```tsx
const [isPending, startTransition] = useTransition()
… s.products.suspend({ page }) …
onPageChange={(next) => startTransition(() => setPage(next))}
```

## Detail seed

- Before card navigation, put the list item into the one ID-keyed detail resource with an action.
- Type the resource as the list item plus optional detail-only fields; leave missing fields `undefined`.
- When the same detail is already active, merge so loaded fields survive.
- Load reviews and related items in a child component with its own `<Suspense>`.

```ts
type Product = ProductSummary & Partial<ProductDetailOnly>

open(item: ProductSummary) {
  const current = this.model.detail.data
  this.model.detail.set(current?.id === item.id ? { ...current, ...item } : item, { arg: item.id })
}
// ✗ "" / [] / null for unloaded fields · ✗ a seed prop or a second query
```

## Actions

- Put every side effect in an action; a UI handler calls one action.
- Read other domains with `state(model)` inside the action, not as arguments.
- Do optimistic CRUD with rollback, then refetch every related query.
- Return a result (or `null` for a handled failure) when the caller sequences actions.

```ts
async delete(id: string) {
  if (!(await popup.confirm({ title: '…', description: '…', destructive: true }))) return
  const before = [...this.model.products.data.items]
  this.model.products.data.items = before.filter((p) => p.id !== id)
  try { await api.product.delete(id); await this.model.products.refetch() }
  catch (error) { this.model.products.data.items = before; throw error }
}
```

- Imperative query methods: `.query(arg?)` · `.refetch()` · `.set(data, { arg })` · `.nextFetch()`.
- `toast` from `@/lib/components/ui/toast`; `popup.confirm` / `popup.alert` from `@/lib/popup`.
- Pass model values to APIs as they are; `snapshot()` only for stable keys or rollback copies.

## Decorators with `intercept`

- Repeat a cross-cutting guard as a decorator, not as copied `if` blocks.
- Use the built-ins first: `@OnError`, `@OnSuccess`, `@Debounce`, `@Throttle`, `@Authorized`.
- Build your own with lazy `intercept<AppContext>(({ state, context }) => …)` to read models and the router.

```ts
// state/user/decorators.ts
export const RequireLogin = intercept<AppContext>(({ state, context }) => ({
  intercept: async (execute, args) => {
    if (state(user).me.data) return execute(...args)
    if (await popup.confirm({ title: '로그인이 필요해요', description: '…' })) context.router.push('/login')
  },
}))

// actions/interact.ts
@RequireLogin
async like(id: string) { … }
```

## Auth

- Hydrate the session once in the service-root client adapter: `useUser.hydrate({ me: { data: initialUser } })`.
- Read `s.me.data` elsewhere; load member/profile tables per user with their own query.

```tsx
const member = useMember((s) => ({ profile: user.me ? s.profile.load(user.me.id) : s.profile }))
// ✗ hydrate(null) — anonymous is { me: { data: null } } · ✗ joining profile tables into getMe
```

Layout wiring: `page.ai.md` → Layout.

## Delivery checklist

- Screen data is read with `.suspend()` in the component that shows it, inside `<Suspense>`.
- Every data boundary has a shaped skeleton; titles and copy sit outside it.
- `.load()` appears only for client-only reads.
- Cards seed the detail with one action; missing detail fields are `undefined`.
- Selectors are narrow and select `actions` whole.
- No action or model assignment runs during render.
- CRUD keeps list, detail and stats consistent and rolls back failed optimistic writes.
- Repeated guards are decorators (`@Authorized`, `intercept`).

## Full references

- https://library.comwit.io/state/llms.txt
- https://library.comwit.io/state/llm/query.txt
- https://library.comwit.io/state/llm/decorator.txt
