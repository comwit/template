"use client";

import { Skeleton } from "@/lib/components/ui/skeleton";
import { siteText } from "@/lib/ui-text";

/** 결제 화면 견적 자리의 뼈대. 라우트 fallback(CheckoutSkeleton)과 견적을 처음 받는 동안 같은 모양으로 쓴다. 순수 UI. */
export function CheckoutBodyBones() {
  return (
    <div aria-busy="true" className="mt-8 space-y-3">
      <Skeleton className="h-6 w-2/3" />
      <Skeleton className="h-5 w-1/3" />
      <Skeleton className="h-9 w-full max-w-sm" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

export function CheckoutSkeleton() {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-16">
      <h1 className="text-display-sm text-balance">{siteText.pages["checkout"]}</h1>
      <CheckoutBodyBones />
    </main>
  );
}
