# Page Layer

## Location
`services/{service}/page/{route}/`

## Structure

**Always split page into separate section files.** Don't put everything in one file.

```
page/{route}/
  ├── index.tsx           # Compose sections only
  ├── hero-section.tsx
  ├── features-section.tsx
  └── cta-section.tsx
```

- `index.tsx` imports and arranges sections
- Each section is its own file
- Keeps code organized and maintainable

## Layout

```
page/layout/
  ├── index.tsx       # Async Server Component: awaits basic getMe()
  ├── client.tsx      # Client: hydration adapter (no user subscription)
  └── content.tsx     # Optional child: user subscriptions + App UI
```

- The app-router service wrapper renders `<Suspense fallback={null}>` above the async service layout. Keep the installed shop session API inside this boundary; do not rerun auth scaffolding.
- Server component (`index.tsx`): awaits basic `getMe()` and passes `initialUser: User | null` to the client adapter. Only Better Auth session/user fields belong in this result.
- Client component (`client.tsx`): only calls `useUser.hydrate({ me: { data: initialUser } })` and renders children. Keep normal user-hook subscriptions, account effects, and interactive UI in child components (e.g. `content.tsx`). This prevents user mutations from rerendering the adapter and replaying an old server seed after logout. Consumers read `state.me.data` without initiating another load.
- The auth boundary has no skeleton or anonymous shell. Separate member/profile/business table data loads lazily through separate queries after the user is known; see `state.ai.md`.
- Session errors propagate; `null` means confirmed anonymous. Keep server guards for protected routes and API authorization.
- Root Layout is `src/lib/layout/` (`index.tsx` server + `client.tsx`; globals: StateProvider, OverlayProvider, `Toaster` from `@/lib/components/ui/toast`)

## Rules
- `'use client'` required (except for layout server components)
- Use `<img />` (do not use `<Image />`)
- For internal routing, use `<Link>` from `next/link` (do not use `<a>`). External links (`http://`, `https://`, `mailto:`, `tel:`, `#anchor`) may use `<a>`
- Do not import API directly → go through state
- Select actions as the complete collection: `actions: state.actions`. Never use `useDomain((state) => state.actions.method)` or alias individual action methods inside the selector; partial selection of the actions proxy can cause a Runtime TypeError.
- layout/index.tsx is a server component, layout/client.tsx is a client component
- Resolve basic auth on the server below the null Suspense boundary; do not bootstrap it from `useEffect` or an initial selector `.load()`.
- Domain-data Suspense boundaries use a skeleton shaped like the content it replaces (same blocks, sizes and gaps), never `null`. Only the service-root auth boundary uses `null`.
- **No client-side data processing** → do all processing in the API:
  - No aggregation like `.filter().length`, `.reduce()` → group/sum in the API
  - No status filtering like `.filter(o => o.status === 'x')` → where conditions in the API
  - No slicing like `.slice(0, N)` → use limit/order by in the API
  - Reason: with pagination, you only have current-page data, which produces incorrect numbers; processing partial (not whole) data is always wrong

## Storybook

- Read [`.storybook/stories/.ai.md`](../../.storybook/stories/.ai.md) before page work.
- Maintain page stories with real service layouts in `src/stories/{service}/`.
- Group by shop/admin user type, then page/state. Do not create standalone component/layout stories or a `/design` route.
- **Mock only the API boundary.** Use real state/query/action, pages, and layouts. Do not inject store state to simulate loading, empty, or error screens. Only `PreviewState` session hydration or the layout's server-auth `initialUser` receives a fixed fixture.

## Design

- **[Storybook design guide](../../.storybook/stories/design-system/design.mdx) is the design source of truth. Read its MDX source first** before page work and **update it first** when design direction changes. Keep it concise and user-facing, with Korean principles and shared theme specimens. Shop screen previews remain in `src/stories/`. Developer-only theme instructions live in `.storybook/stories/.ai.md`. Keep design documentation there instead of creating a separate `design.md`.
- Every design element needs a purpose: hierarchy, understanding, action, state feedback, or brand impression. Remove elements whose absence leaves meaning and usability unchanged.
- Until the project defines its own principles, follow the design guide. Public landing pages use **one message per section**, expressed as **a large statement and a supporting visual**. Avoid habitual eyebrows, subtitles, and helper captions.
- Use `text-soft-foreground` for body copy and descriptions. Reserve `text-muted-foreground` for supporting dates, counts, authors, and field help unnecessary for the core task.
- Components follow the token system: **override `:root` in the project theme block of `src/app/globals.css` to update the whole app**. Do not edit installed `src/app/comwit-tokens.css`; add new tokens in `globals.css`.
- Pair surfaces/text with `bg-X`/`text-X-foreground`. Use purpose-specific typography (`text-display-*`/`title-*`/`body`/`caption`) and radius/shadow tokens such as `shadow-card`.
- **Use existing tokens:** `bg-[color:var(--primary)]` → `bg-primary`, `text-[14px]` → `text-label`, `shadow-[var(--shadow-card)]` → `shadow-card`.
- **Avoid raw hex/arbitrary values where practical, but they are allowed** for one-off decoration, third-party brands, runtime values (`w-[var(--radix-popover-trigger-width)]`), and layout values (`max-h-[280px]`). Promote them to `@theme` tokens when they repeat; do not force single-file colors into global tokens.

## UI Components

- **UI source is installed by comwit-ui.** `src/lib/components/ui/*`, `popup.tsx`, `interaction.ts`, `overlay-motion.tsx`, `ui-text.ts`, and `utils/cn.ts` are CLI-installed source powered by `@comwit/ui`. Configuration lives in root `comwit.json`.
- **Read each component file before using it.** Its header documents parts, props, and examples.
- **Install missing components before building them:** check `pnpm ui list`, then `pnpm ui add <name>`. Compose existing components only for controls missing from the registry. Gallery: https://library.comwit.io/ui/components
- Installed files are project-owned and editable, but change appearance through `globals.css` tokens first. `pnpm ui add <name> --overwrite` replaces local edits.
- **Labels:** default labels, screen-reader names, and picker date locale are centralized in the Korean resource `src/lib/ui-text.ts`. Edit it for app-wide defaults; use `labels`/`placeholder`/`title` props for individual screens.
- **No native interactive elements (enforced by Oxlint):** `<button>`, `<input>`, `<select>`, and `<textarea>` are forbidden by `custom/no-native-interactive` in `src/services/**/*.tsx`, except `_components` folders. Use installed components:
  - Actions/inputs: `Button`, `Chip`, `Input`, `InputGroup`, `Textarea`, `TextField` (label/help/error), `Form` (react-hook-form), `Select`, `Autocomplete`, `Checkbox`, `RadioGroup`, `Switch`, `SegmentedControl`.
  - Dates/rich text: `DatePicker`, `TimePicker`, `MonthPicker`, `Calendar`, `Editor` (Tiptap).
  - Overlays: `Dialog`, `Sheet`, `BottomSheet` (drag to dismiss), `Popover`, `DropdownMenu`, and `popup.confirm`/`popup.alert`/`popup.sheet` from `@/lib/popup`.
  - Notifications: `toast` from `@/lib/components/ui/toast` (never import `sonner` directly), `Alert`.
  - Display/data: `Card`, `Badge`, `Avatar`, `Skeleton`, `EmptyState`, `Separator`, `Tabs`, `Accordion`, `Collapsible`, `Table`, `DataTable` (server pagination), `Pagination`, `Pager`.
  - This branch is a storefront, not an app-shell scaffold. Preserve its cart, checkout and account navigation when branding it.
- Import scroll chrome (`ScrollChromeProvider`/`useScrollChrome`) and `useMobile` from `@comwit/ui`; they have no installed source files.
- **Admin pages:** `@/services/admin/_components` contains only admin compositions: responsive `AdminShell`, `AdminPage`/`AdminSection`/`AdminPageHeader`, `AdminStatCard`/`AdminChartCard`/`AdminCharts`, `AdminDefinitionList`, `AdminListRow`, `AdminReasonDialog`, and card surface classes such as `adminCard`. Reuse UI controls (`TextField` + `Input`, `Chip`, `Avatar`, `EmptyState`, `DataTable`, etc.).
- **Date/time inputs & bottom sheets**: `<Input type="date">` renders the shared `DatePicker` internally while keeping input-style `value` / `defaultValue`, `onChange(event)`, form submission/reset, and `min` / `max` / `required`. Use `DatePicker` directly for its string-valued `onChange`, locale, or picker labels. `DatePicker` / `TimePicker` / `MonthPicker` auto-switch desktop Popover ↔ mobile bottom sheet via `useMobile`. For imperative mobile sheets/confirms use `popup.sheet` / `popup.confirm` / `popup.alert`.
- Tailwind v4
- **Text wrap**: prefer the `text-balance` option (`text-wrap: balance`) for headings/short text to keep lines evenly balanced
- **Animation**: Tailwind CSS animations by default. For complex effects, use `motion` from `motion/react` (avoid relayout: prefer scale, translate, opacity over x, y, width, height)
- Use regular `<img>` tags (NOT Next.js `<Image>` component)
- For initial design: use Unsplash images (`https://images.unsplash.com/...`)
- Icons: prefer `@comwit/ui/icons` and `/icons/animated` for new common UI. Existing shop screens retain their `lucide-react` icons; do not replace commerce UI merely to change its icon package.

## Image Uploads

이미지는 **업로드 전 클라에서 리사이즈**하고, **`ImageAsset { url, width, height, thumb? }` 하나로 통일**해서 저장한다. (리사이즈 유틸 `resizeImageVariants`·`resizeImage` 와 `ImageAsset` 타입은 `@/lib/image`.)

- **상품 이미지는 `resizeImageVariants()`** — 본 이미지(긴 변 1600px) + 썸네일(480px)을 webp 로 만든다. 원본을 그대로 올리지 않는다. 한 장만 필요한 곳(프로필 등)은 `resizeImage()`.
- 저장 형태는 `ImageAsset` 로 통일. 리사이즈 결과의 `width`/`height` 를 그대로 넣는다. (DB `image` 칼럼 = `JSON.stringify(ImageAsset)` — repository 규약 참고, 여러 장은 `ImageAsset[]`)
- **썸네일은 서버가 묶는다.** 썸네일 업로드를 먼저 완료하고 본 이미지 `complete` 때 그 id 를 넘기면 서버가 `thumb` 를 기록한다. 클라에서 `{ ...image, thumb }` 로 붙이면 상품 저장 검증(기록한 JSON 과 문자열 비교)에 걸린다.
- 표시: 카드·목록·장바구니는 `<img src={image.thumb ?? image.url} width={image.width} height={image.height} loading="lazy" decoding="async" />`, 상세 갤러리는 `image.url`. width/height 를 넘겨 **레이아웃 시프트(CLS) 방지**. 갤러리 첫 장은 이미 받아 둔 `thumb` 를 배경으로 깔고 `url` 을 덮으면 목록 → 상세 전환 때 깜빡이지 않는다.
- 레이어: **리사이즈·PUT 업로드는 클라(page)**, **presign·complete 는 api 레이어(server action)** → state 액션으로 연결. 어드민 `product-images.tsx` 가 기준 구현이다.
- 모바일 안전: EXIF 회전 고정 + 디코드-단계 다운샘플 + webp 인코딩을 유틸이 처리하므로 폰 사진도 그대로 넘기면 된다.
- 시드·스크립트(서버)는 `scripts/seed/images.ts` 의 `uploadProductImage`·`uploadPublicImage`·`uploadImageSet` 을 쓴다(sharp, 같은 규격).

```tsx
import { resizeImageVariants, uploadPresignedImage, type ImageAsset } from "@/lib/image"

// 1) 클라에서 본 이미지 + 썸네일 생성
const { full, thumb } = await resizeImageVariants(file)
// 2) 썸네일 먼저: presign → PUT → complete (state 액션 경유, 내부적으로 api → Comwit Cloud)
const thumbTicket = await media.actions.prepare(thumb.blob.type)
await uploadPresignedImage(thumbTicket, thumb.blob)
await media.actions.complete(thumbTicket.id, thumb.width, thumb.height)
// 3) 본 이미지: complete 에 썸네일 id 를 넘기면 서버가 ImageAsset.thumb 로 묶어 돌려준다
const ticket = await media.actions.prepare(full.blob.type)
await uploadPresignedImage(ticket, full.blob)
const image: ImageAsset = await media.actions.complete(ticket.id, full.width, full.height, thumbTicket.id)
```

## How to Use Domain State

### Import domain state

```tsx
import { useDomain } from "@/services/{service}/state/{domain}";
import type { DomainType } from "@/services/{service}/state/{domain}";
```

### Rules

- One domain hook call per file
- No destructuring - use namespace style
- Access via `domain.field` and `domain.actions.method()`
- When the view owns an initial query, start it inside the selector: `.suspend(arg)` for screens (server-rendered, cached on return), `.load(arg)` only for client-only reads (`state.ai.md` → Query loading). Do not trigger the initial load with `useEffect`.
- Select a query field without `.suspend()`/`.load()` only when a state action intentionally owns loading.
- When checkout `prepare()` must finish before `pay()`, await its return value in the action sequence. Do not start payment from an effect watching an intermediate state field.

### Example

```tsx
// Good: One call, namespace style
const product = useProduct((state) => ({
  products: state.products.suspend({ page: state.page }),
  actions: state.actions,
}));

// Bad: Multiple calls for same domain
const products = useProduct((state) => state.products);
const actions = useProduct((state) => state.actions);

// Bad: Destructuring
const { products, actions } = useProduct();
```

### Using query data

`.suspend()` returns only once the query has data, so the view renders data
directly. The `<Suspense>` fallback covers the first load and an `error.tsx`
covers a failed first load.

```tsx
const product = useProduct((state) => ({
  products: state.products.suspend({ page: state.page }),
  actions: state.actions,
}));

// isError — a background refetch failed; the cached data is still there
if (product.products.isError) return <Error error={product.products.error} />

// data — actual data
return product.products.data.items.map((p) => <Card key={p.id} product={p} />)
```

`isFetching` is `true` while a background request (refetch after a cached
paint, or a new page) is in flight. The existing data stays on screen as it
is — no skeleton and no dimming. For pagination and
filters keep the arg in the model, change it with an action, and give the
query `placeholderData: keepPreviousData` (`state.ai.md` → Pagination):

```tsx
function ProductList() {
  const product = useProduct((state) => ({
    products: state.products.suspend({ page: state.page }),
    actions: state.actions,
  }));

  return (
    <>
      <ul aria-busy={product.products.isFetching}>
        {product.products.data.items.map((p) => <Card key={p.id} product={p} />)}
      </ul>
      <Pagination
        currentPage={product.products.data.page}
        totalPages={product.products.data.totalPages}
        onPageChange={product.actions.setPage}
      />
    </>
  )
}
```

> `.suspend()` first load → Suspense fallback · revisit with cache → paints at once, `isFetching` in the background · arg change with `keepPreviousData` → keeps the old data, `isFetching` until the new page arrives

## Lists — static shell, list in its own boundary

A list screen keeps its title and fixed copy in the shell and renders the
data-driven part (filters fed by data, items, pager) through `.suspend()`
inside its own `<Suspense>`. The fallback is a skeleton of the list only, so
the title and copy never move.

```tsx
// app/(app)/products/page.tsx — Server Component
export default function Page() {
  return (
    <Products>                                  {/* client shell: <main> + <h1> + copy */}
      <Suspense fallback={<ProductListSkeleton />}>
        <ProductList />                         {/* client: list.suspend(...) + cards + pager */}
      </Suspense>
    </Products>
  )
}
```

- Pages under the service layout SSR the list on direct visits (SEO), and in-app revisits paint from the query cache.
- The shell renders `children` where the list goes; it reads no query.
- The skeleton mirrors the list's own blocks (filter row, card rows) with the same classes for spacing, and reads no state.
- List cards call the detail action before navigating (`onClick={() => actions.open(item)}`) so the detail opens from that seed.
- Lists do not get an intercepting route — they load on entry anyway. Only details are intercepted.

Shop reference: `src/app/(app)/products/page.tsx` + `page/products/` (`Products` shell,
`ProductList`, `ProductListSkeleton`) and the home's new-arrivals section
(`src/app/(app)/page.tsx` + `page/home/`). Cards are `services/app/_components/product-card.tsx`.

## Detail Pages — one view, one resource, three entries

Public detail pages need SSR for SEO **and** must open instantly from a card.
One Client Component with one `.suspend(id)` covers both; the route layer
decides how it is reached.

| Entry | Route | What `.suspend(id)` sees | Result |
|---|---|---|---|
| Direct visit, refresh, shared link, bots | `posts/[id]/page.tsx` (RSC: `cache()`d lookup → `notFound()`, `generateMetadata`) | nothing | SSR in the same request |
| Soft nav from a card | `(.)posts/[id]/page.tsx` (intercepting route, pure client, `useParams`) | the list item put there by `actions.open(post)` | renders at once; detail-only fields fill in from the background refetch |
| Soft nav without a card | intercepting route | nothing | skeleton, then client fetch |

```tsx
// page/post-detail/index.tsx — the only view
"use client";
export default function PostDetail({ postId }: { postId: string }) {
  const post = usePost((state) => ({
    detail: state.detail.suspend(postId),
    actions: state.actions,
  }));
  if (post.detail.isError || !post.detail.data) return <PostNotFound />;
  const data = post.detail.data;
  return (
    <main>
      <h1>{data.title}</h1>                     {/* list fields: always there */}
      {data.body === undefined ? <PostBodyBones /> : <PostBody body={data.body} />}
      <Suspense fallback={<CommentsBones />}>
        <PostComments postId={data.id} />       {/* separate query, own boundary */}
      </Suspense>
    </main>
  );
}

// any post card
<Link href={`/posts/${post.id}`} onClick={() => postState.actions.open(post)}>
```

- The resource type is the list item plus optional detail-only fields (`state.ai.md` → Partial resources). `undefined` = not loaded yet → bones in that spot; `""`/`[]`/`null` = loaded and empty.
- Only `detail` may `.suspend()` in the view's own selector. Any other `.suspend()` there blocks the whole page whenever its cache is empty. Read it in a child component behind its own `<Suspense>` with a bone fallback so the body paints first. A story that opens the detail from a list with the API blocked must still show the seeded fields.
- Keep the intercepting route a pure client page: no server read, no `await`, no metadata. That is what puts the whole page into the default `<Link>` App Shell prefetch. Metadata, JSON-LD and the 404 decision belong to the formal route only.
- Both routes use the detail skeleton as the Suspense fallback, never `null`. The intercepting route also has an `error.tsx` → not-found view for ids that have no cache and do not exist.
- The view sets `document.title` itself because the intercepting route has no metadata. Re-apply it when `<head>` changes (a `MutationObserver` on `document.head`), since Next may insert the layout title after the effect runs.
- Do not wrap `Link` in a custom component for this; the `onClick` → single action is the normal handler rule.

Shop reference: `products/[id]` + `(.)products/[id]` with `page/product-detail/`. The
list item is the whole `ProductView` (`findAll` and `find` share `presentProduct`), so
`actions.open(product)` seeds every field and the detail paints complete.

### Pages behind login

Account pages (orders, purchases) also read with `.suspend()` inside their own
`<Suspense>`; the service layout renders them with the session on the server. A first-load rejection (signed out) throws to the segment's
`error.tsx`, which offers the login link. Use `.load()` only for client-driven
reads such as a quote that changes with user input.
