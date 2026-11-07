"use client";

import { useCatalog } from "@/services/app/state/catalog";
import { storefrontText } from "@/lib/ui-text";
import { EmptyState } from "@/lib/components/ui/empty-state";
import { ProductCard } from "@/services/app/_components/product-card";

// 읽는 상태: useCatalog list(.suspend — 기본 필터, 첫 페이지 8개). 목록 화면과 인자가 달라 캐시 키도 따로다.
// 홈에 다시 오면 같은 인자의 캐시로 바로 그린다. 카드는 평범한 링크 — 상세는 detail 의 `seed` 가 이 캐시에서 항목을 찾아 바로 그린다.
const NEW_ARRIVALS = {
  filter: { search: "", status: "" },
  pageable: { page: 1, limit: 8 },
};

export function NewArrivals() {
  const catalog = useCatalog((state) => ({
    list: state.list.suspend(NEW_ARRIVALS),
  }));
  const list = catalog.list;

  if (list.isError)
    return <p className="mt-4 text-body text-destructive">{list.error}</p>;
  if (list.data.items.length === 0)
    return <EmptyState className="mt-4" title={storefrontText.empty} />;

  return (
    <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
      {list.data.items.map((product) => (
        <li key={product.id}>
          <ProductCard product={product} />
        </li>
      ))}
    </ul>
  );
}
