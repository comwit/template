"use client";

import Link from "next/link";
import { useContent } from "@/services/app/state/content";
import { siteText, courseText } from "@/lib/ui-text";

export { NoticeDetailSkeleton } from "./skeleton";

// 빈 깡통. 파생 프로젝트에서 섹션 파일로 나눠 채운다(page.ai.md).
// 읽는 상태: useContent notice(.suspend(noticeId)). 공개 화면이라 같은 요청에서 SSR(SEO), 첫 응답 전에는
// 라우트의 NoticeDetailSkeleton, 캐시 없이 받은 오류(없는 공지)는 notices/[id]/error.tsx.
export default function NoticeDetail({ noticeId }: { noticeId: string }) {
  const content = useContent((state) => ({
    notice: state.notice.suspend(noticeId),
  }));
  const query = content.notice;
  const notice = query.data;
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-16">
      <p className="text-body-sm text-muted-foreground">
        {siteText.pages["notice-detail"]}
      </p>
      {query.isError ? (
        <p className="mt-8 text-body text-destructive">{query.error}</p>
      ) : !notice ? (
        <p className="mt-8 text-body text-muted-foreground">{courseText.empty}</p>
      ) : (
        <>
          <h1 className="mt-2 text-display-sm text-balance">{notice.title}</h1>
          <p className="mt-1 text-body-sm text-muted-foreground">
            {notice.publishedLabel ?? notice.createdLabel}
          </p>
          <div
            className="mt-6 text-body"
            dangerouslySetInnerHTML={{ __html: notice.content }}
          />
        </>
      )}
      <p className="mt-8 text-body-sm">
        <Link href="/notices" className="underline">
          {siteText.pages["notices"]}
        </Link>
      </p>
    </main>
  );
}
