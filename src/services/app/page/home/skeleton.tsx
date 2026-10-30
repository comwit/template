"use client";

import { ProductCardBones } from "@/services/app/_components/product-card";

/** 홈 새 상품 섹션의 Suspense fallback. NewArrivals 와 같은 격자·카드 크기. 순수 UI. */
export function NewArrivalsSkeleton() {
  return (
    <ul
      aria-busy="true"
      className="mt-4 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4"
    >
      {Array.from({ length: 8 }, (_, index) => (
        <li key={index}>
          <ProductCardBones />
        </li>
      ))}
    </ul>
  );
}
