"use client";

import { Skeleton } from "@/lib/components/ui/skeleton";

/** 강의실 라우트의 Suspense fallback·첫 로딩 뼈대. 플레이어 화면과 같은 폭(영상 + 레슨 목록). 순수 UI. */
export function LearnSkeleton() {
  return (
    <main aria-busy="true" className="mx-auto w-full max-w-6xl px-6 py-8">
      <div className="grid gap-8 md:grid-cols-[1fr_18rem]">
        <div>
          <Skeleton className="aspect-video w-full" />
          <Skeleton className="mt-4 h-8 w-2/3" />
          <Skeleton className="mt-2 h-4 w-1/3" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-9 w-full" />
          ))}
        </div>
      </div>
    </main>
  );
}
