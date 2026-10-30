# State Layer

## Location
`services/{service}/state/{domain}/`

## @comwit/state additional APIs & detailed syntax

This document only covers frequently used `@comwit/state` patterns. The library has many other APIs.

- `persist()` — auto-sync model fields to localStorage/sessionStorage (login tokens, theme, recently viewed items, etc.)
- `query.realtime()` — realtime subscription
- `searchParam()` — typed URL query fields declared inside `model()` (requires `@comwit/state@2.4.0`)
- `slowLoadingMs` / `isSlowLoading` — mark an initial query that remains pending beyond a threshold (requires `@comwit/state@2.4.0`)
- `derive` — read-only computed fields derived from other fields
- `rules` — per-field validation (accessed via `state.$validation`)
- `@Retry()` — retry on failure (supports exponential backoff)
- `@Queue()` — concurrency control (drop / queue / replace)
- `@Log()`, `@Validate()` — logging / argument validation

Check the usage, options, and signatures of these APIs at https://library.comwit.io/llms.txt .

## Structure

```
state/product/
  ├── types.ts          # State + Actions types
  ├── model.ts          # model() with initial state
  ├── actions/
  │     ├── load.ts     # imperative refresh/preload/coordinated queries
  │     ├── crud.ts     # create, update, delete
  │     └── interact.ts # like, bookmark, etc.
  └── index.ts          # create() hook + re-exports
```

**Write types.ts first.** Write order: types.ts → model.ts → actions/\*.ts → index.ts

## Common rules

- Manage list + detail + stats together in the model — on CRUD do an optimistic update + refetch all related queries (list, stats, etc.)
- Define all side effects inside actions (do not expose them to UI components)
  - Call `toast` (`@/lib/components/ui/toast`), `popup.confirm` / `popup.alert` (`@/lib/popup`), etc. inside the action
  - When another model's state is needed, do not receive it as an argument in the action; instead cross-state-model import it internally via state
  - Actions should take as few arguments as possible and manage things via internal state (so callers don't need to know much)
- Re-export api types or define them additionally
- Dependency flow: `page → state → api → repository`
- Server-render domain data with selector `.suspend(arg)` in the Client Component that shows it (see **Server rendering — selector `.suspend()`**). Do not add a Server Component loader, route adapter or extra folders for it; `StateProvider` already streams the SSR result to the client.
- Use `Query` for `.suspend()`/`.load()`, refetching, argument-keyed caching, loading/error state, infinite loading, or realtime behavior.
- Use a selector for every domain hook call. Calling a domain hook without a selector observes the whole model.
- Always select the complete action collection as `actions: state.actions`. Never select one method with `state.actions.init` or alias individual action methods inside a selector. Actions are proxy-backed, and partial selection can trigger a Proxy invariant Runtime TypeError.
- When a view owns the initial query, start it in the selector: `state.queryField.suspend(arg)` for screens (lists, details), `state.queryField.load(arg)` only for client-only reads (see **Query loading**). Do not call an initial-load action from `useEffect`.
- Basic app/admin auth is server-owned: await `getMe()` in the service layout below `<Suspense fallback={null}>`, then hydrate the user query in the client adapter before consumers render. Never bootstrap basic auth from `useEffect` or selector `.load()`.
- Select a query field without `.suspend()`/`.load()` only when an action intentionally owns loading.
- Domain-data Suspense fallbacks are skeletons shaped like the content they replace, never `null`. Only the service-root auth boundary uses `fallback={null}`.

## types.ts

Define State + Actions types. Use `Query<TData, TArg>` to type query fields.

```ts
import type { Query } from '@comwit/state'

export type ProductStats = {
  totalCount: number
  pendingCount: number
  activeCount: number
}

export type ProductState = {
  products: Query<Pageable<Product>, { page: number }>
  stats: Query<ProductStats>
  detail: Query<Product | null, string>
  // Regular data — local state, not a query
  selectedIds: string[]
  isEditMode: boolean
}

export type ProductActions = {
  refreshAll(): Promise<void>
  create(title: string): Promise<void>
  delete(id: string): Promise<void>
  like(): Promise<void>
  openDetail(id: string): void
  // Regular data manipulation
  toggleSelect(id: string): void
  clearSelection(): void
  setEditMode(value: boolean): void
}
```

## model.ts

- Two types of query: `query<TData, TArg>()` (regular), `query.infinite<TData, TArg>()` (infinite scroll)
- `keepPreviousData`: only used in pagination queries

```ts
import { keepPreviousData, model, query } from '@comwit/state'

export const product = model<ProductState>({
  // query data — fetched from the server
  products: query<Pageable<Product>, { page: number }>({
    initialData: { items: [], total: 0, page: 1, limit: 20, totalPages: 0 },
    queryFn: ({ page }) => api.product.findAll({ page, limit: 20 }),
    placeholderData: keepPreviousData,  // only used in pagination
    slowLoadingMs: 500, // optional UI threshold; does not delay the request
  }),
  stats: query<ProductStats>({
    initialData: { totalCount: 0, pendingCount: 0, activeCount: 0 },
    queryFn: () => api.product.getStats(),
  }),
  // detail — the view reads .suspend(id); a card fills it first with actions.open(item)
  detail: query<Product | null, string>({
    initialData: null,
    queryFn: (slug) => api.product.findById(slug),
  }),
  // Regular data — local state, manipulated directly in actions
  selectedIds: [],
  isEditMode: false,
})

// query.infinite — infinite scroll
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

Selector methods (UI only): `.suspend(arg?)` · `.load(arg?)`

Action methods: `.query(arg?, options?)` · `.refetch()` · `.nextFetch()` · `.previousFetch()`
Query data: `data` · `isLoading` · `isSlowLoading` · `isFetching` · `isSuccess` · `isError` · `error` · `hasMore` · `cursor`

```ts
// action — infinite query loadMore
async loadMore() {
  await this.model.posts.nextFetch()
}
```

## actions/

- All side effects go in Actions — UI handlers only call a single action
- Confirmation: use `popup.confirm()` (`@/lib/popup`)

### Server rendering — selector `.suspend()`

- `.suspend(arg)` starts or reuses the query Promise for the serialized arg during render and throws while pending; the nearest `<Suspense>` shows its fallback.
- `StateProvider` (`src/lib/state/provider.tsx`) passes `useServerInsertedHTML`, so a result resolved during SSR streams to the browser as inert JSON and hydration reuses it without calling `queryFn` again (no double API call).
- `queryFn` calls the service API facade as usual. During Client Component SSR the facade runs the Server Function in the same request scope instead of a relative fetch (`src/lib/server-action/ssr-bridge.ts`, registered by the root layout). In build prerender and dev validation renders that Promise never settles, so the boundary stays on its fallback and renders at request time.
- Therefore the Server Component above a `.suspend()` view must sit in a request-time dynamic hole: `await params`, `await searchParams` or `await connection()`. Keep static copy (titles, intro text) outside that hole so it stays in the static shell (`page.ai.md` → Lists).
- Use it only inside an explicit `<Suspense>` below `StateProvider`. Results must be JSON-serializable; realtime and streaming resources are not supported.
- A first request that fails (no cached data) throws to the nearest Error Boundary (`error.tsx`). With cached data, a background failure keeps the data and sets `isError`. When a 404 decision is needed, make it first in the RSC with a cached lookup and `notFound()`.
- A cache entry that already has data (filled by an action's `resource.set(data, { arg })`, or by an earlier `.suspend`/`.load` of the same arg) returns synchronously from `.suspend(arg)` and refetches in the background after commit (`staleTime: 0`). Returning to a screen therefore paints from cache without a skeleton, and intercepting routes open instantly from a card's seed (`page.ai.md` → Detail Pages).
- For arg changes (pagination, filters) wrap the change in `startTransition`/`useTransition` and show progress with `isPending`. Where the arg lives is a trade-off: in React state (`useState`) the transition holds the old list while the next one loads, but the arg resets when the screen unmounts; in the model (`state.page`, `state.filter`) the arg survives navigation, so returning paints the same page from cache, but model fields are read through `useSyncExternalStore`, which React re-renders synchronously, so a change can show the boundary's skeleton until the new page arrives.
- Do not split a view into a seeded `.load` branch and an SSR `.suspend` branch. One view, one `.suspend(arg)`.

```tsx
const detail = useProduct((state) => state.detail.suspend(id))

// pagination: page in React state keeps the current page visible while the next one loads
const [page, setPage] = useState(1)
const [isPending, startTransition] = useTransition()
const product = useProduct((state) => ({
  products: state.products.suspend({ page }),
  actions: state.actions,
}))
const changePage = (next: number) => startTransition(() => setPage(next))
```

### Partial resources — seed first, fill the rest

- One ID-keyed detail resource. Before card navigation, an action puts the list item into it: `this.model.detail.set(item, { arg: item.id })`. The detail view keeps reading `detail.suspend(id)`. Do not create a seed model, a seed prop, a list-lookup fallback, or a second query for the same resource.
- Prefer one presenter for list and detail so the list item is the whole resource. When the list genuinely carries fewer fields, type the resource as the list item plus optional detail-only fields (`Summary & Partial<DetailOnly>`). Missing fields stay `undefined` until the detail response arrives; the view renders a skeleton only for `undefined` fields. Never fill them with `""`, `[]` or `null` — those mean "loaded and empty".
- `.set()` replaces the entry. When the card opens the detail that is already active (`this.model.detail.data?.id === item.id`), merge so loaded detail fields are not wiped: `set({ ...current, ...item }, { arg: item.id })`.
- Detail-only resources that are not part of the core record (reviews, related items) are separate queries, read in a child component behind its own `<Suspense>` with a section skeleton. They never `.suspend()` in the core detail selector.

### `.hydrate()` — only when `.suspend()` cannot be used

`.hydrate()` seeds a query from data a Server Component already resolved. Use it
only where render-time loading does not fit: the basic auth boundary below, or a
value that must be decided on the server before the page renders. Call it
unconditionally in a small client adapter that does not subscribe to that model;
it accepts `null`/`undefined` as a no-op, never calls `queryFn`, and ignores
equivalent repeated seeds.

### Basic auth and lazy separate-table data

`UserState.me` is `Query<User | null>`. The service layout awaits `getMe()`
(Better Auth session/user fields only) below `<Suspense fallback={null}>` and
passes its resolved result to the client adapter:

```tsx
function AppLayoutClient({ children, initialUser }: Props) {
  useUser.hydrate({ me: { data: initialUser } })
  return <>{children}</>
}
```

Hydrate is synchronous; await the API on the server, not this hook. Always pass
`{ me: { data: null } }` for a confirmed anonymous session: `hydrate(null)` is a
no-op. Consumers read `state.me.data` without `.load()`. Session-read errors
propagate to an error boundary, never become anonymous. Use `me.set(userOrNull)`
in interactive auth actions, and `me.data` in cross-domain login checks.

Keep Better Auth's existing session-cookie cache and its session recheck when
that cache is missing or expired. Do not bypass it with ordinary
`disableCookieCache: true` calls or treat a cookie-cache miss as anonymous.
Admin retains its DB-authoritative session policy.

Prefer client loading only where needed for separate member/profile/business
tables. Keep this extra data out of `getMe`, `User`, the auth cookie/cache,
`customSession`, and the auth layout await. For example, use a separate model:

```ts
export const member = model<MemberState>({
  // MemberState.profile: Query<MemberProfile | null, string>
  profile: query<MemberProfile | null, string>({
    initialData: null,
    // userId keys the client cache; the API derives/authorizes its user itself.
    queryFn: () => api.member.getProfile(),
  }),
})
```

```tsx
function MemberPanel() {
  const user = useUser((state) => ({ me: state.me.data }))
  const member = useMember((state) => ({
    profile: user.me ? state.profile.load(user.me.id) : state.profile,
  }))

  if (!user.me) return null
  if (member.profile.isError) return <ProfileError />
  if (!member.profile.isSuccess) return null
  return <MemberProfileView profile={member.profile.data} />
}
```

Use a per-user query key (and clear private caches on sign-out if retained by the
model). Do not use previous-account placeholder data. A missing profile row does
not change the authenticated user to `null`. Server guards and API authorization
remain authoritative; client state is for rendering.

### Query loading — `.suspend()` for screens, `.load()` for client-only reads

- Screens (lists, details, account pages) read their initial query with `.suspend(arg)` so they render on the server and paint from cache on return.
- Use `.load(arg?)` only for client-driven reads that should not suspend the screen: a quote recalculated as the user types a coupon, a player that starts after mount, a section that must keep its own inline loading UI.
- `.load()` is selector-only. It starts the request after React commits, deduplicates the same key, and changes cache keys when its serialized argument changes.
- Merely selecting the query field is passive and never fetches.
- Do not wrap an initial query action in `useEffect`. Existing code may still work, but new code must start the request from the selector.

```tsx
function CouponQuote({ code }: { code: string }) {
  const checkout = useCheckout((state) => ({
    quote: state.quote.load({ code }),
    actions: state.actions,
  }))

  if (checkout.quote.isError) return <ErrorMessage error={checkout.quote.error} />
  if (checkout.quote.isLoading) return <QuoteSkeleton />

  return <QuoteView quote={checkout.quote.data} />
}
```

Use passive selection only when another owner has already initialized or loaded the query:

```tsx
const product = useProduct((state) => ({
  products: state.products, // passive: an action owns loading
  actions: state.actions,
}))
```

### Slow initial loading in 2.4.0

Set `slowLoadingMs` on `query()`, `query.infinite()`, `query.realtime()`,
`local.query()`, or `local.infinite()` when the UI should distinguish a slow
first load. `isSlowLoading` starts false and becomes true only if initial
loading continues past that many milliseconds. It clears on success, error,
or usable cached data. It does not delay the request or change `isLoading`.
An omitted threshold has no timer and keeps the flag false. Check the query
status before rendering data; `isSlowLoading: false` does not mean success.

```tsx
const products = useProduct((state) => state.products.load({ page }))
if (products.isError) return <ErrorMessage error={products.error} />
if (products.isLoading && !products.isSuccess) {
  return products.isSlowLoading ? <ProductsSkeleton /> : null
}
if (!products.isSuccess) return null
return <ProductsView products={products.data} />
```

### load.ts — imperative and coordinated queries

- Keep user-event refreshes, preloads, and coordinated requests in actions.
- Use `.query(arg?, options?)` for an imperative initial request and `.refetch()` for an active query that was already started by selector `.load()` or `.query()`.
- `.refetch()` is a no-op before an initial query has established an argument/cache key.
- Server Function transport serializes enumerable model Proxy values through the wire codec. Do not call `snapshot()` solely for API transport; reserve it for stable query keys, optimistic rollback, or another application-level fixed copy.

```ts
import { action } from '@comwit/state'

export const loadActions = action<Pick<ProductActions, 'refreshAll'>>(({ state }) => {
  class LoadActions {
    private model = state(product)

    async refreshAll() {
      await Promise.all([
        this.model.products.refetch(),
        this.model.stats.refetch(),
      ])
    }
  }
  return new LoadActions()
})
```

### Manipulating regular data — push, filter, direct assignment

Non-query fields are changed directly in actions. For arrays, `push`, `pop`, `splice`, and reassignment (`filter`, etc.) are all allowed.

```ts
export const selectActions = action<Pick<ProductActions, 'toggleSelect' | 'clearSelection' | 'setEditMode'>>(({ state }) => {
  class SelectActions {
    private model = state(product)

    toggleSelect(id: string) {
      const idx = this.model.selectedIds.indexOf(id)
      if (idx >= 0) {
        this.model.selectedIds.splice(idx, 1)   // remove
      } else {
        this.model.selectedIds.push(id)          // add
      }
    }

    clearSelection() {
      this.model.selectedIds = []                // reassign
    }

    setEditMode(value: boolean) {
      this.model.isEditMode = value              // simple assignment
    }
  }
  return new SelectActions()
})
```

### Typed URL state in 2.4.0

Use `searchParam()` for filters or selections that belong in the URL. Declare
the field in `model()` and read it through the ordinary domain hook. Action
assignments update the URL with `replace` history by default; use `history:
'push'` when the change should create a browser Back entry. Valid URL values
take priority over defaults. Missing or invalid values use `defaultValue`, or
`null` when no default is supplied. Unrelated query parameters and the hash
are preserved. The Provider manages the browser connection for observed URL
models; no extra URL hook is needed.

```ts
import { action, model, searchParam } from '@comwit/state'

export const filters = model({
  page: searchParam({ key: 'page', type: 'number', defaultValue: 1 }),
  archived: searchParam({ key: 'archived', type: 'boolean' }),
})

export const filterActions = action(({ state }) => ({
  setPage(page: number) {
    state(filters).page = page
  },
}))
```

For request-aware SSR, pass the optional synchronous
`getServerSearchParams?: () => string | null` to `ComwitProvider`; without it,
server and first hydration reads use defaults before the client reconciles the
URL. Advanced asynchronous updates can use `searchParam.getSnapshot()` and
`searchParam.set(..., { ifRevision })` to reject stale writes. URL state does not
fetch route data or validate domain IDs. See
https://library.comwit.io/docs/api/router for the complete 2.4.0 API.

### crud.ts — CRUD + popup.confirm

```ts
import { action, OnError } from '@comwit/state'
import { toast } from '@/lib/components/ui/toast'
import { popup } from '@/lib/popup'

export const crudActions = action<Pick<ProductActions, 'create' | 'delete'>>(({ state }) => {
  class CrudActions {
    private model = state(product)

    @OnError((error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Unexpected error')
    })
    async create(title: string) {
      // optimistic — immediately reflect stats counts
      this.model.stats.data.totalCount += 1
      this.model.stats.data.pendingCount += 1
      await api.product.create({ title })
      // refetch — refresh both list and stats
      await Promise.all([
        this.model.products.refetch(),
        this.model.stats.refetch(),
      ])
    }

    @OnError((error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Unexpected error')
    })
    async delete(id: string) {
      if (!await popup.confirm({ title: 'Delete this item?', description: 'This cannot be undone.', destructive: true })) return
      // optimistic — remove from list + decrement stats counts
      const snapshot = { items: [...this.model.products.data.items], stats: { ...this.model.stats.data } }
      this.model.products.data.items = this.model.products.data.items.filter((p) => p.id !== id)
      this.model.stats.data.totalCount -= 1
      try {
        await api.product.delete(id)
        await Promise.all([
          this.model.products.refetch(),
          this.model.stats.refetch(),
        ])
      } catch {
        // rollback
        this.model.products.data.items = snapshot.items
        this.model.stats.data = snapshot.stats
        throw new Error('Failed to delete')
      }
    }
  }
  return new CrudActions()
})
```

### interact.ts — Cross-Domain Auth + List/Current synchronization

Read another domain's model with `state()`. Use `@Authorized` for the auth guard. Access the router via `context`.

```ts
export const interactActions = action<Pick<ProductActions, 'like' | 'openDetail'>, AppContext>(({ state, context }) => {
  class InteractActions {
    private model = state(product)
    private user = state(userModel)

    @Authorized({
      when: () => !!this.user.me.data,
      onDeny: () => context.router.push('/login'),
    })
    @OnError((error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Unexpected error')
    })
    async like() {
      // optimistic update — sync current + list
      this.model.currentProduct!.likeCount += 1
      this.model.currentProduct!.isLiked = true
      const item = this.model.products.data.items.find((p) => p.id === this.model.currentProduct!.id)
      if (item) { item.likeCount += 1; item.isLiked = true }
      await api.product.like(this.model.currentProduct!.id)
      await this.model.products.refetch()
    }

    openDetail(id: string) { context.router.push(`/product/${id}`) }
  }
  return new InteractActions()
})
```

## UI usage

- **When a view owns the query, call `.load()` in its selector and handle error/loading/data states in that order.**

```tsx
const product = useProduct((state) => ({
  products: state.products.load({ page }),
}))

if (product.products.isError) return <ErrorMessage error={product.products.error} />
if (product.products.isLoading) return <Skeleton />
return product.products.data.items.map((p) => <Card key={p.id} product={p} />)
```

## Decorators

| Decorator | Purpose |
|-----------|---------|
| `@OnError(fn)` | Side effects on error (the error propagates automatically; do not re-throw in the callback). Default: `toast.error()` |
| `@OnSuccess(fn)` | Success callback |
| `@Debounce(ms)` | Debounce |
| `@Throttle(ms)` | Throttle |
| `@Authorized({ when, onDeny })` | Auth guard |

### Reusable decorators — `intercept`

When you need to apply the same precondition (login required, permission check, common logging, etc.) repeatedly across multiple actions, build a custom decorator with `intercept`. It is meant to bundle things at the class level so you don't have to attach `@Authorized` to every method.

The `intercept` factory shares `state`/`context` access, so set up the state subscription once at declaration time and run the original method via `execute` on every call. You can attach it to the entire class (all methods) or to individual methods.

```ts
import { intercept } from '@comwit/state'
import { user } from '@/services/app/state/user/model'
import { popup } from '@/lib/popup'

// Login required — if not logged in, redirect to login page
const LoginRequired = intercept(({ state, context }) => {
  const u = state(user)
  return {
    intercept: (execute, args) => {
      if (!u.me.data) {
        context.router.push('/login')
        return   // execute not called → original method blocked
      }
      return execute(...args)   // pass args through as-is
    },
  }
})

// Shared delete confirmation — if the convention is that the first arg is an id, args can also be used
const ConfirmDelete = intercept(() => ({
  intercept: async (execute, args) => {
    if (!(await popup.confirm({ title: 'Delete this item?', description: 'This cannot be undone.', destructive: true }))) return
    return execute(...args)
  },
}))
```

**Applying to the entire class** — every method goes through LoginRequired

```ts
@LoginRequired
class PostCrudActions {
  async create(title: string) { ... }
  async update(id: string, title: string) { ... }

  @ConfirmDelete   // class + method decorator combo — both must pass for execution
  async delete(id: string) { ... }
}
```

**Applying only to individual methods** — reads are open, only writes require login

```ts
class MixedActions {
  async readOnlyList() { ... }            // callable by anyone

  @LoginRequired
  async create(title: string) { ... }     // login required
}
```

- Class decorators and method decorators can be used together. Execution order is **outer (class) → inner (method)**.
- If `execute` is not called, the original method does not run (blocked by early return).
- Combine with existing `@OnError` for error handling — no need to handle toast inside intercept.
