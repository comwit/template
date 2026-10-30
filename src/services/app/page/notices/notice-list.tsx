"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useContent } from "@/services/app/state/content";
import { courseText } from "@/lib/ui-text";
import { Pager } from "@/lib/components/ui/pager";
import { EmptyState } from "@/lib/components/ui/empty-state";
import { cn } from "@/lib/utils/cn";

// 읽는 상태: useContent notices(.suspend({ page })). 공개 목록이라 SSR(SEO), 돌아오면 캐시로 바로, 페이지 변경은 transition.

export function NoticeList() {
  const [pending, startTransition] = useTransition();
  const content = useContent((state) => ({
    notices: state.notices.suspend({ page: state.page }),
    actions: state.actions,
  }));
  const list = content.notices;
  return (
    <>
      {list.isError ? (
        <p className="mt-8 text-body text-destructive">{list.error}</p>
      ) : list.data.items.length === 0 ? (
        <EmptyState className="mt-8" title={courseText.empty} />
      ) : (
        <ul
          aria-busy={pending}
          className={cn("mt-8 flex flex-col gap-3", pending && "opacity-60")}>
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
        onChange={(page) => startTransition(() => content.actions.setPage(page))}
      />
    </>
  );
}
