"use client";

import { Skeleton } from "@/lib/components/ui/skeleton";

/** 상품 목록 Suspense 구멍의 fallback. ProductList 와 같은 자리·크기(필터 줄 + 카드 줄). 순수 UI. */
export function ProductListSkeleton() {
  return (
    <div aria-busy="true">
      <div className="mt-6 flex flex-wrap gap-2">
        <Skeleton className="h-9 w-60" />
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-9 w-28" />
      </div>
      <ul className="mt-8 flex flex-col gap-4">
        {Array.from({ length: 4 }, (_, index) => (
          <li key={index}>
            <Skeleton className="h-32 w-24" />
            <Skeleton className="mt-2 h-6 w-2/3" />
            <Skeleton className="mt-1 h-4 w-full" />
            <Skeleton className="mt-1 h-4 w-1/2" />
            <Skeleton className="mt-1 h-5 w-24" />
          </li>
        ))}
      </ul>
    </div>
  );
}
