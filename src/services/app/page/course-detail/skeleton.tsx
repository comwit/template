"use client";

import { Skeleton } from "@/lib/components/ui/skeleton";

/**
 * 상세 라우트 두 곳(정식·인터셉트)의 Suspense fallback. state·캐시를 읽지 않는 순수 UI(page.ai.md).
 * 파생 프로젝트는 자기 상세 구조에 맞게 뼈대만 바꾼다.
 */
export function CourseDetailSkeleton() {
  return (
    <main
      aria-busy="true"
      className="mx-auto w-full max-w-5xl px-6 py-16"
    >
      <Skeleton className="h-4 w-20" />
      <Skeleton className="mt-3 h-8 w-3/4" />
      <Skeleton className="mt-3 h-6 w-28" />
      <div className="mt-8 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <div className="mt-8 space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </main>
  );
}
