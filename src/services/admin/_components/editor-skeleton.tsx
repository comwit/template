"use client";

import { Skeleton } from "@/lib/components/ui/skeleton";

/** 관리자 편집 화면(강의·상품) 라우트의 Suspense fallback. 편집 화면의 머리줄 + 섹션 카드 자리를 잡는다. 순수 UI. */
export function EditorSkeleton() {
  return (
    <div aria-busy="true" className="space-y-6 p-6">
      <Skeleton className="h-8 w-1/3" />
      {Array.from({ length: 3 }, (_, index) => (
        <Skeleton key={index} className="h-40 w-full" />
      ))}
    </div>
  );
}
