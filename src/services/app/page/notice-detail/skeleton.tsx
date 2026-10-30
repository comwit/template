"use client";

import { Skeleton } from "@/lib/components/ui/skeleton";
import { siteText } from "@/lib/ui-text";

/** 공지 상세 라우트의 Suspense fallback. NoticeDetail 과 같은 자리(머리말·제목·날짜·본문·돌아가기). 순수 UI. */
export function NoticeDetailSkeleton() {
  return (
    <main aria-busy="true" className="mx-auto w-full max-w-5xl px-6 py-16">
      <p className="text-body-sm text-muted-foreground">
        {siteText.pages["notice-detail"]}
      </p>
      <Skeleton className="mt-2 h-8 w-2/3" />
      <Skeleton className="mt-1 h-4 w-24" />
      <div className="mt-6 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <Skeleton className="mt-8 h-4 w-16" />
    </main>
  );
}
