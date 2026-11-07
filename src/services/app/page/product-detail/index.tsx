"use client";

import { useCatalog } from "@/services/app/state/catalog";
import { storefrontText } from "@/lib/ui-text";
import { ProductNotFound } from "./not-found";

export { ProductDetailSkeleton } from "./skeleton";
export { ProductNotFound } from "./not-found";

// 빈 깡통. 파생 프로젝트에서 섹션 파일로 나눠 채운다(page.ai.md). 담기는 useCart.actions.
//
// 진입 셋이 같은 `.suspend(id)` 한 줄을 탄다(state.ai.md → Detail seed).
//   - 직접 진입·새로고침·공유·봇: suspend → 같은 요청에서 SSR(SEO), 결과는 클라 캐시로 스트리밍.
//   - 목록에서 소프트 내비: detail 모델의 `seed` 가 list 캐시의 항목을 찾아 바로 그린다(`isPartial: true`, 스켈레톤 없음).
//     커밋 뒤 백그라운드로 전체 상세를 다시 받아 최신 재고로 올라간다.
//   - 목록 캐시가 없는 소프트 내비(장바구니 → 상품): 클라에서 기다리는 동안 스켈레톤.
// 상세에만 있는 데이터(관련 상품·리뷰 등)는 별도 query 를 자식 컴포넌트의 자기 Suspense 경계 안에서 `.suspend()` 한다
// (섹션 뼈대 fallback) — 상세 본문 선택자에는 detail 만 `.suspend()` 한다.
export default function ProductDetail({ productId }: { productId: string }) {
  const catalog = useCatalog((state) => ({
    detail: state.detail.suspend(productId),
    actions: state.actions,
  }));
  const product = catalog.detail.data;

  // 없는 상품은 queryFn 이 null 을 돌려준다(목록 캐시에 남은 삭제 상품도 재조회가 null). 오류는 not-found 가 아니다:
  // seed 위에서 재조회가 실패하면 `isError` 와 함께 목록 항목이 그대로 남는다.
  if (!product) return <ProductNotFound />;

  // 이 템플릿의 목록 항목은 곧 상세(같은 presentProduct)라 `isPartial` 동안에도 모든 필드가 있다.
  // 상세에만 있는 필드를 더하면 `catalog.detail.isPartial ? <SectionBones /> : <Section data={product.x} />` 로 가른다.
  return (
    <main
      aria-busy={catalog.detail.isPartial}
      className="mx-auto w-full max-w-5xl px-6 py-8 md:py-16"
    >
      <p className="text-body-sm text-muted-foreground">
        {storefrontText.pages["product-detail"]}
      </p>
      <h1 className="mt-2 text-display-sm text-balance">{product.name}</h1>
      <p className="mt-2 text-body">{product.priceLabel}</p>
    </main>
  );
}
