"use client";

import { Skeleton } from "@/lib/components/ui/skeleton";

/**
 * 상세 라우트 두 곳(정식·인터셉트)의 Suspense fallback. state·캐시를 읽지 않는 순수 UI(page.ai.md).
 * 갤러리 비율·2단 구성·여백을 실제 화면과 맞춰 두면 내용이 들어올 때 레이아웃이 흔들리지 않는다.
 * 파생 프로젝트는 자기 상세 구조에 맞게 뼈대만 바꾼다.
 */
export function ProductDetailSkeleton() {
  return (
    <main
      aria-busy="true"
      className="mx-auto w-full max-w-5xl px-6 py-8 md:py-16"
    >
      <div className="grid gap-8 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] md:gap-12">
        <Skeleton className="aspect-[3/4] w-full rounded-card" />
        <div className="space-y-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-6 w-28" />
          <div className="space-y-2 pt-4">
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
          </div>
          <Skeleton className="h-12 w-full rounded-pill" />
          <div className="space-y-2 pt-6">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      </div>
    </main>
  );
}
