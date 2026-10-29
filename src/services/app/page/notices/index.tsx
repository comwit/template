"use client";

import Link from "next/link";
import { useContent } from "@/services/app/state/content";
import { siteText, courseText } from "@/lib/ui-text";
import { Pager } from "@/lib/components/ui/pager";
import { EmptyState } from "@/lib/components/ui/empty-state";

// 빈 깡통. 파생 프로젝트에서 섹션 파일로 나눠 채운다(page.ai.md).
// 읽는 상태: useContent notices(.load({ page })).
export default function Notices() {
  const content = useContent((state) => ({
    notices: state.notices.load({ page: state.page }),
    actions: state.actions,
  }));
  const list = content.notices;
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-16">
      <h1 className="text-display-sm text-balance">
        {siteText.pages["notices"]}
      </h1>
      {list.isError ? (
        <p className="mt-8 text-body text-destructive">{list.error}</p>
      ) : list.isLoading ? (
        <p className="mt-8 text-body text-muted-foreground">{courseText.loading}</p>
      ) : list.data.items.length === 0 ? (
        <EmptyState className="mt-8" title={courseText.empty} />
      ) : (
        <ul className="mt-8 flex flex-col gap-3">
          {list.data.items.map((notice) => (
            <li key={notice.id}>
              <Link href={`/notices/${notice.id}`} className="block">
                <p className="text-title-md">
                  {notice.pinned ? "[고정] " : ""}
                  {notice.title}
                </p>
                <p className="text-body-sm text-muted-foreground">
                  {notice.publishedLabel ?? notice.createdLabel}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Pager
        page={list.data.page}
        totalPages={list.data.totalPages}
        onChange={(page) => content.actions.setPage(page)}
      />
    </main>
  );
}
