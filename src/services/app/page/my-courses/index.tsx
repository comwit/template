"use client";

import Link from "next/link";
import { useEnrollments } from "@/services/app/state/enrollments";
import { siteText, courseText } from "@/lib/ui-text";
import { Pager } from "@/lib/components/ui/pager";
import { EmptyState } from "@/lib/components/ui/empty-state";
import { Button } from "@/lib/components/ui/button";

// 빈 깡통. 파생 프로젝트에서 섹션 파일로 나눠 채운다(page.ai.md).
// 읽는 상태: useEnrollments list(.load({ page })). 로그인 필요(API 가 거부하면 isError).
export default function MyCourses() {
  const enrollments = useEnrollments((state) => ({
    list: state.list.load({ page: state.page }),
    actions: state.actions,
  }));
  const list = enrollments.list;
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-16">
      <h1 className="text-display-sm text-balance">
        {siteText.pages["my-courses"]}
      </h1>
      {list.isError ? (
        <p className="mt-8 text-body text-destructive">
          {list.error}{" "}
          <Link href="/login" className="underline">
            {siteText.pages["login"]}
          </Link>
        </p>
      ) : list.isLoading ? (
        <p className="mt-8 text-body text-muted-foreground">{courseText.loading}</p>
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
        <ul className="mt-8 flex flex-col gap-4">
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
    </main>
  );
}
