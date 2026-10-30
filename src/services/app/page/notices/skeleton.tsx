"use client";

import { Skeleton } from "@/lib/components/ui/skeleton";

/** 목록 Suspense 경계의 fallback. NoticeList 와 같은 자리·크기로 그린다. 순수 UI(page.ai.md). */
export function NoticeListSkeleton() {
  return (
    <ul aria-busy="true" className="mt-8 flex flex-col gap-3">
      {Array.from({ length: 4 }, (_, index) => (
        <li key={index}>
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="mt-1 h-4 w-24" />
        </li>
      ))}
    </ul>
  );
}
