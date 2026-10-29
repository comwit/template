"use client";

import Link from "next/link";
import { useEnrollments } from "@/services/app/state/enrollments";
import { siteText, courseText } from "@/lib/ui-text";

// 빈 깡통. 파생 프로젝트에서 섹션 파일로 나눠 채운다(page.ai.md).
// 읽는 상태: useEnrollments certificate(.load(certificateId)). 로그인 필요(본인 수료증만).
export default function Certificate({ certificateId }: { certificateId: string }) {
  const enrollments = useEnrollments((state) => ({
    certificate: state.certificate.load(certificateId),
  }));
  const query = enrollments.certificate;
  const certificate = query.data;
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-16">
      <h1 className="text-display-sm text-balance">
        {siteText.pages["certificate"]}
      </h1>
      {query.isError ? (
        <p className="mt-8 text-body text-destructive">
          {query.error}{" "}
          <Link href="/login" className="underline">
            {siteText.pages["login"]}
          </Link>
        </p>
      ) : query.isLoading || !certificate ? (
        <p className="mt-8 text-body text-muted-foreground">{courseText.loading}</p>
      ) : (
        <dl className="mt-8 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-body">
          <dt className="text-muted-foreground">수료번호</dt>
          <dd>{certificate.number}</dd>
          <dt className="text-muted-foreground">강의</dt>
          <dd>{certificate.courseTitle}</dd>
          <dt className="text-muted-foreground">강사</dt>
          <dd>{certificate.instructorName ?? "—"}</dd>
          <dt className="text-muted-foreground">수강생</dt>
          <dd>{certificate.userName}</dd>
          <dt className="text-muted-foreground">총 학습 시간</dt>
          <dd>{certificate.totalDurationLabel}</dd>
          <dt className="text-muted-foreground">발급일</dt>
          <dd>{certificate.issuedLabel}</dd>
        </dl>
      )}
      <p className="mt-8 text-body-sm">
        <Link href="/account/courses" className="underline">
          {siteText.pages["my-courses"]}
        </Link>
      </p>
    </main>
  );
}
