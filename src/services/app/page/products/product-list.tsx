"use client";

import { useCatalog } from "@/services/app/state/catalog";
import { storefrontText } from "@/lib/ui-text";
import { EmptyState } from "@/lib/components/ui/empty-state";
import { Pager } from "@/lib/components/ui/pager";
import { ProductCard } from "@/services/app/_components/product-card";

// 읽는 상태: useCatalog list(.suspend — 필터·페이지는 모델의 filter/page).
// `.suspend()` 라 직접 진입·봇은 같은 요청에서 SSR 된 목록을 받는다(SEO). 다른 화면에 갔다가 돌아오면
// 같은 인자의 캐시로 기다리지 않고 바로 그리고, 커밋 뒤 백그라운드로 다시 받는다.
// 필터·페이지는 모델에 있어 다른 화면에 갔다 와도 그대로다(같은 인자 캐시로 바로 그림). 바꾸면 keepPreviousData 로
// 지금 목록을 그대로 둔다(state.ai.md).
// 카드는 상세로 가는 평범한 링크다. 상세는 detail 모델의 `seed` 가 이 목록 캐시에서 항목을 찾아 바로 그린다(state.ai.md → Detail seed).
export function ProductList() {
  const catalog = useCatalog((state) => ({
    list: state.list.suspend({
      filter: state.filter,
      pageable: { page: state.page, limit: 20 },
    }),
    actions: state.actions,
  }));
  const list = catalog.list;

  if (list.isError)
    return <p className="mt-8 text-body text-destructive">{list.error}</p>;
  if (list.data.items.length === 0)
    return <EmptyState className="mt-8" title={storefrontText.empty} />;

  return (
    <>
      <ul
        aria-busy={list.isFetching}
        className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4"
      >
        {list.data.items.map((product) => (
          <li key={product.id}>
            <ProductCard product={product} />
          </li>
        ))}
      </ul>
      <Pager
        className="mt-10"
        page={list.data.page}
        totalPages={list.data.totalPages}
        onChange={(page) => catalog.actions.setPage(page)}
      />
    </>
  );
}
