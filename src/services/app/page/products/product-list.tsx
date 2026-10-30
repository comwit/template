"use client";

import { useTransition } from "react";
import { useCatalog } from "@/services/app/state/catalog";
import { storefrontText } from "@/lib/ui-text";
import { EmptyState } from "@/lib/components/ui/empty-state";
import { Pager } from "@/lib/components/ui/pager";
import { cn } from "@/lib/utils/cn";
import { ProductCard } from "@/services/app/_components/product-card";

// 읽는 상태: useCatalog list(.suspend — 필터·페이지는 모델의 filter/page).
// `.suspend()` 라 직접 진입·봇은 같은 요청에서 SSR 된 목록을 받는다(SEO). 다른 화면에 갔다가 돌아오면
// 같은 인자의 캐시로 기다리지 않고 바로 그리고, 커밋 뒤 백그라운드로 다시 받는다.
// 필터·페이지는 모델에 있어 다른 화면에 갔다 와도 그대로다(같은 인자 캐시로 바로 그림). 변경은 transition 안에서 하지만
// 모델 값은 useSyncExternalStore 로 읽혀 동기 렌더되므로 새 목록이 올 때까지 스켈레톤이 보일 수 있다(state.ai.md).
// 카드 클릭 시 actions.open(product) 로 상세 리소스를 채운다(목록 항목 = 상세) → 인터셉트 라우트가 바로 그린다.
export function ProductList() {
  const [pending, startTransition] = useTransition();
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
        aria-busy={pending}
        className={cn(
          "mt-8 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4",
          pending && "opacity-60",
        )}
      >
        {list.data.items.map((product) => (
          <li key={product.id}>
            <ProductCard
              product={product}
              onOpen={() => catalog.actions.open(product)}
            />
          </li>
        ))}
      </ul>
      <Pager
        className="mt-10"
        page={list.data.page}
        totalPages={list.data.totalPages}
        onChange={(page) => startTransition(() => catalog.actions.setPage(page))}
      />
    </>
  );
}
