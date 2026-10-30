# State layer — usage guide

How this template uses `@comwit/state`. `StateProvider` is already set up, so screens read server
data with `.suspend()`. Full API: https://library.comwit.io/state/llms.txt

## Make a domain

```text
src/services/{service}/state/{domain}/
  types.ts        → State + Actions types (write first)
  model.ts        → model() with queries and plain fields
  actions/*.ts    → action() classes
  index.ts        → create() hook
```

```ts
// types.ts
export type ProductState = { products: Query<Pageable<Product>, { page: number }>; page: number }
export type ProductActions = { setPage(page: number): void }
```

```ts
// model.ts
export const product = model<ProductState>({
  products: query<Pageable<Product>, { page: number }>({ initialData: emptyPage<Product>(), queryFn: ({ page }) => api.product.findAll({ page, limit: 20 }) }),
  page: 1,
})
```

```ts
// actions/load.ts
export const loadActions = action<Pick<ProductActions, 'setPage'>>(({ state }) => {
  class LoadActions {
    private model = state(product)
    setPage(page: number) { this.model.page = page }
  }
  return new LoadActions()
})
```

```ts
// index.ts
export * from './types'
export const useProduct = create<ProductState, ProductActions>(product, { actions: [loadActions, …] })
```

```tsx
// screen
const product = useProduct((s) => ({ products: s.products.suspend({ page: s.page }), actions: s.actions }))
```

- Keep related list, detail, stats, filters, and local UI state in one domain.
- Always pass a selector and select `actions` whole. Do not pick single action methods.
- UI event handlers call one action; actions own side effects and cross-domain access.

## Read queries

```tsx
// Screens: rendered on the server, painted from cache on return.
const detail = useProduct((s) => s.detail.suspend(id))

// Client-only: renders isLoading first, requests after commit.
const quote = useCheckout((s) => s.quote.load({ code }))

// Passive. Never starts a request.
const cached = useProduct((s) => s.products)
```

- `Query<T, Arg>`: remote query state. `Query.Infinite<T, Arg>`: cursor/infinite query.
- Plain values: client-owned reactive state.
- Do not start an initial load from `useEffect`.

### Screens with `.suspend()`

```tsx
// page.tsx
<Suspense fallback={<ProductListSkeleton />}>
  <ProductList />
</Suspense>
```

The fallback is a skeleton shaped like the content.

### Pagination with `keepPreviousData`

```ts
products: query<Pageable<Product>, { page: number }>({
  …
  placeholderData: keepPreviousData,
}),
```

```tsx
function ProductList() {
  const product = useProduct((s) => ({ products: s.products.suspend({ page: s.page }), actions: s.actions }))
  return (
    <Grid items={product.products.data.items} aria-busy={product.products.isFetching} … >
      <Pagination currentPage={product.products.data.page} onPageChange={product.actions.setPage} />
    </Grid>
  )
}
```

A new page keeps the current list on screen unchanged (`isFetching: true`) instead of showing the skeleton. Do not dim it.

## Detail seed

```ts
// model.ts
detail: query<Product | null, string>({ initialData: null, queryFn: (id) => api.product.findById(id) }),

// actions — a card fills the detail before navigating
open(item: Product) {
  this.model.detail.set(item, { arg: item.id })
}
```

```tsx
const detail = useProduct((s) => s.detail.suspend(id)) // one resource, one .suspend
```

Type a lighter list item as `ProductSummary & Partial<ProductDetailOnly>` and leave unloaded fields
`undefined`. Load reviews and related items in a child component with its own `<Suspense>`.

## Actions and decorators

Decorate actions instead of copying guards, toasts, and concurrency checks into each method:

```ts
import { action, Authorized, Debounce, OnError, Queue } from '@comwit/state'
import { toast } from '@/lib/components/ui/toast'
import { popup } from '@/lib/popup'
import type { AppContext } from '@/lib/state'
import { RequireLogin } from '../../user/decorators'
import { user } from '../../user/model'

const toastError = (error: unknown) => toast.error(error instanceof Error ? error.message : '문제가 생겼어요')

export const productActions = action<ProductActions, AppContext>(({ state }) => {
  class ProductActions {
    private model = state(product)

    @RequireLogin
    @OnError(toastError)
    async like(id: string) {
      const item = this.model.products.data.items.find((p) => p.id === id)
      if (item) item.isLiked = true
      try {
        await api.product.like(id)
      } catch (error) {
        if (item) item.isLiked = false
        throw error
      }
    }

    @Authorized({
      when: () => !!state(user).me.data?.emailVerified,
      onDeny: () => popup.alert({ description: '이메일 인증 후 이용할 수 있어요' }),
    })
    @Queue('drop')
    @OnError(toastError)
    async remove(id: string) {
      if (!(await popup.confirm({ title: '삭제할까요?', description: '되돌릴 수 없어요', destructive: true }))) return
      await api.product.remove(id)
      await this.model.products.refetch()
    }

    @Debounce(300)
    search(keyword: string) { … }
  }
  return new ProductActions()
})
```

- `.query(arg?)`, `.refetch()`, `.set(data, { arg })`, `.nextFetch()`.
- Built-ins: `@OnError`, `@OnSuccess`, `@Authorized`, `@Debounce`, `@Throttle`, `@Retry`, `@Queue`,
  `@Log`, `@Validate`. Decorators run outer to inner.
- Read other domains with `state(model)` inside the action, not as arguments.

## Custom decorators with `intercept`

```ts
// state/user/decorators.ts
import { intercept } from '@comwit/state'
import { popup } from '@/lib/popup'
import type { AppContext } from '@/lib/state'
import { user } from './model'

export const RequireLogin = intercept<AppContext>(({ state, context }) => ({
  intercept: async (execute, args) => {
    if (state(user).me.data) return execute(...args)
    if (await popup.confirm({ title: '로그인이 필요해요', description: '로그인 페이지로 이동할까요?' })) context.router.push('/login')
  },
}))
```

Put `@RequireLogin` on a method, or on the class to guard every method.

## State updates

Call actions from event handlers. Do not call a mutating action or assign model state during render.

## Auth

```tsx
useUser.hydrate({ me: { data: initialUser } }) // service-root client adapter only; anonymous = { data: null }
```

Elsewhere read `s.me.data`. Load profile or member tables with their own query once `me` is known.

## Other features

- Derived state: `computed()` or model `derive` getters.
- Validation: model `rules`; read `$validation`.
- Persistence: `persist({ key, defaultValue, storage? })`.
- URL state: `searchParam({ key, type?, defaultValue? })`.
- History: `history: true`; use `$history.undo()` / `redo()`.

## Delivery checklist

- Screen data uses `.suspend()` inside `<Suspense>` with a shaped skeleton; `.load()` only for
  client-only reads.
- Paginated queries use `keepPreviousData`; the page lives in the model and changes through an action.
- Cards seed the detail with one action; unloaded fields are `undefined`.
- Guards, error toasts, and concurrency are decorators (`@RequireLogin`, `@Authorized`, `@OnError`,
  `@Queue`), not repeated `if` blocks.
- CRUD rolls back failed optimistic writes and refetches related queries.
- No action or model assignment runs during render.

## Full references

- https://library.comwit.io/state/llms.txt
- https://library.comwit.io/state/llm/query.txt
- https://library.comwit.io/state/llm/decorator.txt
