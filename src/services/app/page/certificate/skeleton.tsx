"use client";

import { Skeleton } from "@/lib/components/ui/skeleton";
import { siteText } from "@/lib/ui-text";

/** 수료증 라우트의 Suspense fallback. Certificate 와 같은 자리(제목·정보 표·돌아가기)로 그린다. 순수 UI. */
export function CertificateSkeleton() {
  return (
    <main aria-busy="true" className="mx-auto w-full max-w-5xl px-6 py-16">
      <h1 className="text-display-sm text-balance">
        {siteText.pages["certificate"]}
      </h1>
      <div className="mt-8 space-y-2">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-5 w-1/2" />
        ))}
      </div>
      <Skeleton className="mt-8 h-4 w-20" />
    </main>
  );
}
