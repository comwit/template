"use client";

import { ProductCardBones } from "@/services/app/_components/product-card";

/**
 * 목록 Suspense 구멍의 fallback. ProductList 와 같은 격자·카드 크기로 그려 목록이 들어와도 화면이 밀리지 않게 한다.
 * state·캐시를 읽지 않는 순수 UI(page.ai.md). 제목은 셸(Products)에 있으므로 여기서 다시 그리지 않는다.
 */
export function ProductListSkeleton() {
  return (
    <ul
      aria-busy="true"
      className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4"
    >
      {Array.from({ length: 8 }, (_, index) => (
        <li key={index}>
          <ProductCardBones />
        </li>
      ))}
    </ul>
  );
}
