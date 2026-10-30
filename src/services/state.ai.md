# State layer — usage guide

How this template uses `@comwit/state`. `StateProvider` is already set up, so screens read server
data with `.suspend()`. Full API: https://library.comwit.io/state/llms.txt

## Domain structure

```text
src/services/{service}/state/{domain}/
  types.ts
  model.ts
  actions/
    load.ts
    crud.ts
    interact.ts
  index.ts
```

Write in that order. Keep related list, detail, stats, filters, and local UI state in one domain.
Actions own commands, side effects, cross-domain access, and optimistic rollback. UI event handlers
should normally call one action.

## Types and model

```ts
import type { Query } from '@comwit/state'

export type ProductState = {
  products: Query<Pageable<Product>, { page: number }>
  detail: Query<Product | null, string>
  page: number
  selectedIds: string[]
}

export type ProductActions = {
  setPage(page: number): void
  open(item: Product): void
  like(id: string): Promise<void>
  remove(id: string): Promise<void>
  search(keyword: string): void
}
```

```ts
import { keepPreviousData, model, query } from '@comwit/state'

export const product = model<ProductState>({
  products: query<Pageable<Product>, { page: number }>({
    initialData: emptyPage<Product>(),
    queryFn: ({ page }) => api.product.findAll({ page, limit: 20 }),
    placeholderData: keepPreviousData,
  }),
  detail: query<Product | null, string>({
    initialData: null,
    queryFn: (id) => api.product.findById(id),
  }),
  page: 1,
  selectedIds: [],
})
```

- `Query<T, Arg>`: remote query state. `Query.Infinite<T, Arg>`: cursor/infinite query.
- Plain values: client-owned reactive state.
- `keepPreviousData` only on paginated queries.

## Read queries: suspend or load

```tsx
// Screens: rendered on the server, painted from cache on return.
const detail = useProduct((s) => s.detail.suspend(id))

// Client-only: renders isLoading first, requests after commit.
const quote = useCheckout((s) => s.quote.load({ code }))

// Passive. Never starts a request.
const cached = useProduct((s) => s.products)
```

### Screens with `.suspend()`

```tsx
// page.tsx
<Suspense fallback={<ProductListSkeleton />}>
  <ProductList />
</Suspense>

// product-list.tsx
'use client'

function ProductList() {
  const product = useProduct((s) => ({ products: s.products.suspend({ page: s.page }), actions: s.actions }))
  return <Grid items={product.products.data.items} onPage={product.actions.setPage} />
}
```

```ts
// actions — a new arg loads its own cache entry
setPage(page: number) {
  this.model.page = page
}
```

- The fallback is a skeleton shaped like the content.
- Do not start an initial load from `useEffect`.

### Detail seed

```ts
// A card fills the detail before navigating.
open(item: Product) {
  this.model.detail.set(item, { arg: item.id })
}
```

```tsx
const detail = useProduct((s) => s.detail.suspend(id)) // one resource, one .suspend
```

Type a lighter list item as `ProductSummary & Partial<ProductDetailOnly>` and leave unloaded fields
`undefined`. Load reviews and related items in a child component with its own `<Suspense>`.

## Actions

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

    setPage(page: number) {
      this.model.page = page
    }

    open(item: Product) {
      this.model.detail.set(item, { arg: item.id })
    }

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

### Custom decorators with `intercept`

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

## Create and use a domain hook

```ts
export const useProduct = create<ProductState, ProductActions>(product, { actions: [productActions] })
```

```tsx
const product = useProduct((s) => ({ detail: s.detail.suspend(id), actions: s.actions }))
return <button onClick={() => product.actions.like(id)}>Like</button>
```

Always pass a selector and select `actions` whole. Do not pick single action methods.

## Other features

- Derived state: `computed()` or model `derive` getters.
- Validation: model `rules`; read `$validation`.
- Persistence: `persist({ key, defaultValue, storage? })`.
- URL state: `searchParam({ key, type?, defaultValue? })`.
- History: `history: true`; use `$history.undo()` / `redo()`.

## Delivery checklist

- Screen data uses `.suspend()` inside `<Suspense>` with a shaped skeleton; `.load()` only for
  client-only reads.
- Cards seed the detail with one action; unloaded fields are `undefined`.
- Guards, error toasts, and concurrency are decorators (`@RequireLogin`, `@Authorized`, `@OnError`,
  `@Queue`), not repeated `if` blocks.
- CRUD rolls back failed optimistic writes and refetches related queries.
- No action or model assignment runs during render.

## Full references

- https://library.comwit.io/state/llms.txt
- https://library.comwit.io/state/llm/query.txt
- https://library.comwit.io/state/llm/decorator.txt
