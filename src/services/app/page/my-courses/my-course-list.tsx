"use client";

import Link from "next/link";
import { useEnrollments } from "@/services/app/state/enrollments";
import { siteText, courseText } from "@/lib/ui-text";
import { Pager } from "@/lib/components/ui/pager";
import { EmptyState } from "@/lib/components/ui/empty-state";
import { Button } from "@/lib/components/ui/button";

// 읽는 상태: useEnrollments list(.suspend({ page })). 로그인 필요 — 세션이 없으면 API 가 거부하고 .suspend() 가 던져
// (app)/account/error.tsx 가 로그인 안내를 그린다. 돌아오면 캐시로 바로, 페이지 변경은 keepPreviousData 로 지금 목록 유지.

export function MyCourseList() {
  const enrollments = useEnrollments((state) => ({
    list: state.list.suspend({ page: state.page }),
    actions: state.actions,
  }));
  const list = enrollments.list;
  return (
    <>
      {list.isError ? (
        <p className="mt-8 text-body text-destructive">
          {list.error}{" "}
          <Link href="/login" className="underline">
            {siteText.pages["login"]}
          </Link>
        </p>
      ) : list.data.items.length === 0 ? (
        <EmptyState
          className="mt-8"
          title={courseText.empty}
          action={
            <Button asChild>
              <Link href="/courses">{siteText.pages["courses"]}</Link>
            </Button>
          }
        />
      ) : (
        <ul
          aria-busy={list.isFetching}
          className="mt-8 flex flex-col gap-4">
          {list.data.items.map((enrollment) => (
            <li key={enrollment.id}>
              <p className="text-title-md">{enrollment.courseTitle}</p>
              <p className="text-body-sm text-muted-foreground">
                {enrollment.statusLabel} · {enrollment.progressPercent}% (
                {enrollment.completedLessons}/{enrollment.lessonCount}) ·{" "}
                {enrollment.startedLabel}
                {enrollment.expiresLabel ? ` · ${enrollment.expiresLabel}` : ""}
              </p>
              <p className="mt-1 flex gap-3 text-body-sm">
                {enrollment.status === "active" ? (
                  <Link href={`/learn/${enrollment.courseId}`} className="underline">
                    {siteText.pages["learn"]}
                  </Link>
                ) : null}
                {enrollment.certificateId ? (
                  <Link
                    href={`/account/certificates/${enrollment.certificateId}`}
                    className="underline"
                  >
                    {siteText.pages["certificate"]}
                  </Link>
                ) : null}
              </p>
            </li>
          ))}
        </ul>
      )}
      <Pager
        page={list.data.page}
        totalPages={list.data.totalPages}
        onChange={(page) => enrollments.actions.setPage(page)}
      />
    </>
  );
}
