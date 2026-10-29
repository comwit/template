"use client";

import Link from "next/link";
import { useContent } from "@/services/app/state/content";
import { siteText, courseText } from "@/lib/ui-text";

// 빈 깡통. 파생 프로젝트에서 섹션 파일로 나눠 채운다(page.ai.md).
// 읽는 상태: useContent notice(.load(noticeId)).
export default function NoticeDetail({ noticeId }: { noticeId: string }) {
  const content = useContent((state) => ({
    notice: state.notice.load(noticeId),
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
      ) : query.isLoading || !notice ? (
        <p className="mt-8 text-body text-muted-foreground">{courseText.loading}</p>
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
