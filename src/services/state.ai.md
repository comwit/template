# State Layer

## Location

`services/{service}/state/{domain}/` · dependency flow `page → state → api → repository`

```
state/product/
  ├── types.ts          # State + Actions types (write first)
  ├── model.ts          # model() with initial state
  ├── actions/
  │     ├── load.ts     # refresh / preload / coordinated queries
  │     ├── crud.ts     # create, update, delete
  │     └── interact.ts # like, bookmark, navigation
  └── index.ts          # create() hook + re-exports
```

Other APIs (`persist`, `searchParam`, `query.realtime`, `slowLoadingMs`, `derive`, `rules`, decorators, `intercept`): https://library.comwit.io/state/llms.txt

## Reading queries

```tsx
s.detail.suspend(id)          // screens (lists, details, account): SSR + cache on return
s.quote.load({ code })        // client-only reads with their own inline loading UI
s.products                    // passive: an action owns loading
// ✗ useEffect(() => actions.load(), [])
```

## Selectors

```tsx
const product = useProduct((s) => ({ detail: s.detail.suspend(id), actions: s.actions }))
// ✗ useProduct()                — always pass a selector
// ✗ s.actions.like / { like }  — select the whole s.actions
```

## types.ts

```ts
import type { Query } from '@comwit/state'

export type ProductState = {
  products: Query<Pageable<Product>, { page: number }>
  stats: Query<ProductStats>
  detail: Query<Product | null, string>
  selectedIds: string[]                    // plain state
}

export type ProductActions = {
  refreshAll(): Promise<void>
  create(title: string): Promise<void>
  delete(id: string): Promise<void>
  open(item: Product): void
  toggleSelect(id: string): void
}
```

## model.ts

```ts
export const product = model<ProductState>({
  products: query<Pageable<Product>, { page: number }>({
    initialData: { items: [], total: 0, page: 1, limit: 20, totalPages: 0 },
    queryFn: ({ page }) => api.product.findAll({ page, limit: 20 }),
    placeholderData: keepPreviousData,     // pagination only
  }),
  detail: query<Product | null, string>({
    initialData: null,
    queryFn: (id) => api.product.findById(id),
  }),
  …
  selectedIds: [],
})

export const feed = model<FeedState>({
  posts: query.infinite<Post[]>({
    initialData: [],
    queryFn: async (_, { state }) => {
      const page = state.cursor ? Number(state.cursor) : 1
      const res = await api.feed.findAll({ page, limit: 20 })
      return { data: res.items, cursor: String(page + 1), hasMore: page < res.totalPages }
    },
  }),
})
```

Actions: `.query(arg?)` · `.refetch()` · `.set(data, { arg })` · `.nextFetch()` · `.previousFetch()`

## Screen boundary

```tsx
// app/(app)/products/page.tsx — Server Component
<Suspense fallback={<ProductListSkeleton />}>   {/* skeleton shaped like the content */}
  <ProductListRoute />
</Suspense>

async function ProductListRoute() {
  await connection()                            // request-time hole for .suspend()
  return <ProductList />                        // client: s.products.suspend(...)
}
// ✗ fallback={null} — only the service-root auth boundary
```

`StateProvider` already streams SSR results to the client. Results must be JSON-serializable.
A first-load failure goes to `error.tsx`; decide 404 with `notFound()` in the Server Component.

## Pagination

```tsx
const [page, setPage] = useState(1)
const [isPending, startTransition] = useTransition()
const product = useProduct((s) => ({ products: s.products.suspend({ page }), actions: s.actions }))
… onPageChange={(next) => startTransition(() => setPage(next))}
```

## Detail seed

```ts
type Product = ProductSummary & Partial<ProductDetailOnly>   // missing fields stay undefined

open(item: Product) {
  const current = this.model.detail.data
  this.model.detail.set(current?.id === item.id ? { ...current, ...item } : item, { arg: item.id })
  …
}
// view: s.detail.suspend(id) — one resource, one .suspend
// ✗ "" / [] / null for missing fields · ✗ seed prop or second query
// ✗ reviews, related items in the core selector — child component + own <Suspense>
```

## Actions

All side effects live in actions; UI handlers call one action. Read other domains with `state()`.

```ts
export const crudActions = action<Pick<ProductActions, 'create' | 'delete'>>(({ state }) => {
  class CrudActions {
    private model = state(product)

    @OnError((error: unknown) => toast.error(error instanceof Error ? error.message : 'Unexpected error'))
    async delete(id: string) {
      if (!(await popup.confirm({ title: 'Delete this item?', destructive: true }))) return
      const before = [...this.model.products.data.items]
      this.model.products.data.items = before.filter((p) => p.id !== id)   // optimistic
      try {
        await api.product.delete(id)
        await Promise.all([this.model.products.refetch(), this.model.stats.refetch()])
      } catch (error) {
        this.model.products.data.items = before                             // rollback
        throw error
      }
    }
    …
  }
  return new CrudActions()
})
```

```ts
export const interactActions = action<Pick<ProductActions, 'like'>, AppContext>(({ state, context }) => {
  class InteractActions {
    private model = state(product)
    private user = state(userModel)

    @Authorized({ when: () => !!this.user.me.data, onDeny: () => context.router.push('/login') })
    async like() { … }
  }
  return new InteractActions()
})
```

```ts
// load.ts
async refreshAll() {
  await Promise.all([this.model.products.refetch(), this.model.stats.refetch()])
}
```

- `toast` from `@/lib/components/ui/toast`, `popup.confirm` / `popup.alert` from `@/lib/popup`.
- Plain fields change directly: `this.model.selectedIds.push(id)`, `this.model.isEditMode = true`.
- Pass model values to APIs as they are. ✗ `snapshot()` only for API transport.
- `@OnError` · `@OnSuccess` · `@Debounce` · `@Throttle` · `@Authorized`; repeat a guard across a class with `intercept`.

## Auth

```tsx
useUser.hydrate({ me: { data: initialUser } })   // service-root client adapter; anonymous = { data: null }
// ✗ hydrate(null) · ✗ getMe from useEffect or .load()
```

Layout wiring: `page.ai.md` → Layout. Separate profile/member tables load per user:

```tsx
const user = useUser((s) => ({ me: s.me.data }))
const member = useMember((s) => ({ profile: user.me ? s.profile.load(user.me.id) : s.profile }))
// ✗ joining them into getMe, User or the auth layout
```
