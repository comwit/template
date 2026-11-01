<!-- app-setup:routing -->
## Mobile App Detail UI (app-setup installed)

For mobile details, this section replaces the general SSR Detail Pages / hydration examples above. Render one shared detail component from the one canonical route, using `detail.suspend(id)` as described in `state.ai.md`.

- **Seeded navigation (`isPartial: true`):** the list item is on screen at once. Render the summary fields and skeletons for the detail-only areas (body, permissions UI, comments) until the upgrade settles; keep the content visible during that upgrade — `isFetching` is never a reason for a full skeleton.
- **Full result (`isPartial: false`):** render everything. `data === null` is the confirmed not-found state and replaces the content; render JSON-LD only here, from the query data.
- **Empty cache:** the route's `<Suspense fallback={<PostSkeleton />}>` covers the first core-resource request. Direct visits resolve that same read on the server; in-app navigation without list data resolves it on the client.
- **Independent sections:** reviews, related posts and other detail-only queries load separately and show section skeletons. Never add their `.suspend()` reads to the core detail selector; put them behind child Suspense boundaries or use `.load()` with local loading UI.

```tsx
// PostDetail reads the one resource; PostView receives it plus `full` (null while partial).
// The route file already rendered <DetailScreen>; the view renders body content only.
function PostView({ post, full }: { post: PostSummary & Partial<Post>; full: Post | null }) {
  return (
    <>
      {full ? <PostJsonLd post={full} /> : null}
      <PostHeader post={post} />
      {full ? <PostBody body={full.body} /> : <PostBodySkeleton />}
      <PostReviews id={post.id} /> {/* Own .load() query and section loading/error UI. */}
    </>
  )
}
```

Handle confirmed not-found/permission results before content so deleted or inaccessible items do not remain visible. On a transient upgrade failure (`isError` with data still present), keep the content with a retry indicator; without usable data, show the error screen. `.suspend()` without a seed can throw query errors, so give route/section error boundaries the same domain-aware policy. Suspense fallbacks are simple skeletons and never read the failing resource themselves.

### Screen shell and back navigation

- `AppScreen` and `DetailScreen` (`@/lib/components/ui/app-screen`) are the page's transition boundary (`SsgoiPageBoundary`), not just its app bar. Exactly one per page, as the page's top-most element: tabs use `AppScreen`, details `<DetailScreen fallback="/posts">`, `(entry)` screens `<AppScreen bar={false}>` when they own their top edge (no app bar, no safe-area spacing). Render it in the route file (or the one page component the route renders) with the page's `Suspense` inside, so loading and error states keep the same screen and back button. Never nest screens, wrap one in a `<div>`, or put one inside a Suspense fallback.
- Choose the logical parent for `fallback`: the built-in back button goes back within the app, or replaces with that parent on direct entry/reload.
- Defaults are tab `flow`, detail `reveal` (hide on scroll down, return on scroll up), and sheet `pinned`. Override `appBarBehavior` only when needed. `className` lands on the boundary element itself (background, `min-h`, bottom padding), so the background moves with the page during OUT.
- Temporary compose/selection screens use `DetailScreen variant="sheet"` for a close button. Add a matching `sheet()` rule through `appTransitions` in the shell's `transitions` prop; both helpers come from `@/lib/components/ui/page-transition`.
- For a full-bleed hero, use `AppScreen bar="none"` and `FloatingBackButton` from `@/lib/components/ui/app-bar`, with `onClick={useBackNavigation('/posts')}` (`@comwit/ui`, called at the component top level). Keep the shell's single scroller and navigation provider; the installed components handle safe areas and scroll behavior.

All shell UI (AppShell, TabShell, AppGroupLayout, AppScreen, app bar, BottomNav, glass, transitions, bottom sheets) is installed comwit-ui source in `@/lib/components/ui`. Group and persistent layouts render `AppGroupLayout` (see Mobile App Route Groups in `src/app/.ai.md`). `layout/` holds only the tab list (`app-tabs.ts`) and PWA banner. Do not recreate shells, app bars, or tab bars; edit appearance through installed files and `src/app/globals.css` tokens.

**Tip — navigate, then scroll.** For a requested section jump, wait for the destination transition to finish and its target to mount, then scroll the actual app scroller with `behavior: 'smooth'` (respect reduced motion). Read `useSsgoiTransition()` from `@ssgoi/react` in an app-service component under the existing shell (SSGOI stays inside `src/services/app`); wait for that navigation's `transitioning` → `idle`, not an initial idle snapshot or an arbitrary timeout. Consume the scroll request once, discard it if navigation changes, and leave ordinary back-scroll restoration to SSGOI.

For data wiring, follow Mobile App Detail State in `state.ai.md`.
<!-- /app-setup:routing -->
