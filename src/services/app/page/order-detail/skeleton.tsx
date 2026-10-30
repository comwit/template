"use client";

import { Skeleton } from "@/lib/components/ui/skeleton";
import { siteText } from "@/lib/ui-text";

/** 주문 상세 라우트의 Suspense fallback. OrderDetail 과 같은 자리(머리말·제목·정보 표)로 그린다. 순수 UI. */
export function OrderDetailSkeleton() {
  return (
    <main aria-busy="true" className="mx-auto w-full max-w-5xl px-6 py-16">
      <p className="text-body-sm text-muted-foreground">
        {siteText.pages["order-detail"]}
      </p>
      <Skeleton className="mt-2 h-8 w-2/3" />
      <div className="mt-6 space-y-2">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-5 w-1/2" />
        ))}
      </div>
    </main>
  );
}
