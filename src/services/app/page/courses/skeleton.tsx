"use client";

import { Skeleton } from "@/lib/components/ui/skeleton";

/**
 * 목록 Suspense 경계의 fallback. CourseList 와 같은 자리·크기(필터 줄 + 카드 줄)로 그려
 * 목록이 들어와도 화면이 밀리지 않게 한다. state·캐시를 읽지 않는 순수 UI(page.ai.md).
 * 제목 등 데이터가 없는 부분은 셸(Courses)에 있으므로 여기서 다시 그리지 않는다.
 */
export function CourseListSkeleton() {
  return (
    <div aria-busy="true">
      <div className="mt-6 flex flex-wrap gap-2">
        <Skeleton className="h-9 w-60" />
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-9 w-28" />
      </div>
      <ul className="mt-8 flex flex-col gap-4">
        {Array.from({ length: 4 }, (_, index) => (
          <li key={index}>
            <Skeleton className="h-32 w-56" />
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
