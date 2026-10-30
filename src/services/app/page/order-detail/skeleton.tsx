"use client";

import { Skeleton } from "@/lib/components/ui/skeleton";
import { storefrontText } from "@/lib/ui-text";

/** 주문 상세 라우트의 Suspense fallback(params 를 읽는 동안). OrderDetail 과 같은 자리로 그린다. 순수 UI. */
export function OrderDetailSkeleton() {
  return (
    <main aria-busy="true" className="mx-auto w-full max-w-5xl px-6 py-16">
      <h1 className="text-display-sm text-balance">
        {storefrontText.pages["order-detail"]}
      </h1>
      <Skeleton className="mt-2 h-5 w-64" />
    </main>
  );
}
