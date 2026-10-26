"use client";

import { useEffect } from "react";
import { useCatalog } from "@/services/app/state/catalog";
import { storefrontText } from "@/lib/ui-text";
import { ProductNotFound } from "./not-found";

export { ProductDetailSkeleton } from "./skeleton";
export { ProductNotFound } from "./not-found";

// 빈 깡통. 파생 프로젝트에서 섹션 파일로 나눠 채운다(page.ai.md). 담기는 useCart.actions.
//
// 진입 셋이 같은 `.suspend(id)` 한 줄을 탄다.
//   - 직접 진입·새로고침·공유·봇: 정식 라우트 `products/[id]` 가 404 판단·metadata 뒤 같은 요청에서 SSR(SEO).
//   - 카드 소프트 내비: `(.)products/[id]` 인터셉트 라우트. 카드의 `actions.open(product)` 이 채운 캐시를 그대로 그린다
//     (스켈레톤 없음, 커밋 뒤 백그라운드 재조회로 재고 갱신).
//   - 캐시 없는 소프트 내비(장바구니 → 상품): 클라에서 기다리는 동안 스켈레톤.
// 상세에만 있는 데이터(관련 상품·리뷰 등)는 별도 query 의 `.load()` 로 지연 로드한다.
export default function ProductDetail({ productId }: { productId: string }) {
  const catalog = useCatalog((state) => ({
    detail: state.detail.suspend(productId),
    actions: state.actions,
  }));
  const product = catalog.detail.data;

  // 인터셉트 라우트에는 metadata 가 없어 탭 제목이 레이아웃 기본값으로 남는다. 정식 라우트의
  // generateMetadata 가 이미 상품명을 넣은 경우(직접 진입)는 건드리지 않는다. 소프트 내비 때 Next 가
  // 레이아웃 <title> 을 이 effect 뒤에 넣기도 하므로 <head> 가 바뀌면 다시 맞춘다(이 상품 주소에 있는 동안만).
  useEffect(() => {
    if (!product) return;
    const apply = () => {
      if (
        location.pathname.endsWith(product.id) &&
        !document.title.includes(product.name)
      )
        document.title = product.name;
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.head, {
      subtree: true,
      childList: true,
      characterData: true,
    });
    return () => observer.disconnect();
  }, [product]);

  // 목록 캐시에 남은 삭제 상품은 재조회가 NOT_FOUND 를 돌려주므로 데이터보다 오류를 먼저 본다.
  if (catalog.detail.isError || !product) return <ProductNotFound />;

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-8 md:py-16">
      <p className="text-body-sm text-muted-foreground">
        {storefrontText.pages["product-detail"]}
      </p>
      <h1 className="mt-2 text-display-sm text-balance">{product.name}</h1>
      <p className="mt-2 text-body">{product.priceLabel}</p>
    </main>
  );
}
