"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useCatalog } from "@/services/app/state/catalog";
import { siteText } from "@/lib/ui-text";
import { Button } from "@/lib/components/ui/button";
import { CourseNotFound } from "./not-found";
import { CurriculumSection } from "./curriculum-section";
import { ReviewsSection } from "./reviews-section";
import {
  CourseActionBones,
  CourseSectionBones,
  CurriculumBones,
} from "./skeleton";

export { CourseDetailSkeleton } from "./skeleton";
export { CourseNotFound } from "./not-found";

// 빈 깡통. 파생 프로젝트에서 섹션 파일로 나눠 채운다(page.ai.md).
// 읽는 상태: useCatalog detail(.suspend(courseId)). 수강평은 reviews-section 이 별도 query 로 지연 로드한다.
//
// 진입 셋이 같은 `.suspend(id)` 한 줄을 탄다.
//   - 직접 진입·새로고침·공유·봇: 정식 라우트 `courses/[id]` 가 404 판단·metadata 뒤 같은 요청에서 SSR(SEO). 전체 필드가 온다.
//   - 카드 소프트 내비: `(.)courses/[id]` 인터셉트 라우트. 카드의 `actions.open(course)` 이 넣은 목록 항목으로
//     제목·가격·요약을 바로 그리고(스켈레톤 없음), 상세 전용 필드(소개·강사·커리큘럼·수강 여부)는 `undefined` 인 동안
//     그 자리만 뼈대로 둔다. 커밋 뒤 같은 detail 리소스의 백그라운드 재조회가 채운다.
//   - 캐시 없는 소프트 내비(학습 화면 → 강의 등): 라우트의 CourseDetailSkeleton 뒤 클라에서 받는다.
export default function CourseDetail({ courseId }: { courseId: string }) {
  const catalog = useCatalog((state) => ({
    detail: state.detail.suspend(courseId),
    actions: state.actions,
  }));
  const course = catalog.detail.data;

  // 인터셉트 라우트에는 metadata 가 없어 탭 제목이 레이아웃 기본값으로 남는다. 정식 라우트의
  // generateMetadata 가 이미 강의명을 넣은 경우(직접 진입)는 건드리지 않는다.
  useEffect(() => {
    if (!course) return;
    const apply = () => {
      if (
        location.pathname.endsWith(course.id) &&
        !document.title.includes(course.title)
      )
        document.title = course.title;
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.head, {
      subtree: true,
      childList: true,
      characterData: true,
    });
    return () => observer.disconnect();
  }, [course]);

  // 목록 캐시에 남은 비공개 강의는 재조회가 NOT_FOUND 를 돌려주므로 데이터보다 오류를 먼저 본다.
  if (catalog.detail.isError || !course) return <CourseNotFound />;

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-16">
      <p className="text-body-sm text-muted-foreground">
        {siteText.pages["course-detail"]}
      </p>
      <h1 className="mt-2 text-display-sm text-balance">{course.title}</h1>
      <p className="mt-2 text-body">
        {course.priceLabel}
        {course.originalPriceLabel ? (
          <span className="ml-2 text-muted-foreground line-through">
            {course.originalPriceLabel}
          </span>
        ) : null}
        {course.discountEndsLabel ? (
          <span className="ml-2 text-body-sm text-muted-foreground">
            {course.discountEndsLabel}
          </span>
        ) : null}
      </p>
      <p className="mt-1 text-body-sm text-muted-foreground">
        {course.categoryName ?? "—"} · {course.levelLabel} · {course.lessonCount}개
        레슨 · {course.totalDurationLabel} · {course.ratingLabel} (
        {course.reviewCount}) · 수강생 {course.enrollmentCount}명
      </p>
      {course.summary ? (
        <p className="mt-4 text-body text-soft-foreground">{course.summary}</p>
      ) : null}

      <div className="mt-6">
        {course.enrollment === undefined ? (
          <CourseActionBones />
        ) : course.enrollment ? (
          <Button asChild>
            <Link href={`/learn/${course.id}`}>
              이어서 수강하기 ({course.enrollment.progressPercent}%)
            </Link>
          </Button>
        ) : (
          <Button asChild>
            <Link href={`/checkout/course/${course.id}`}>
              {siteText.pages["checkout"]}
            </Link>
          </Button>
        )}
      </div>

      {course.instructor === undefined ? (
        <section className="mt-10">
          <h2 className="text-title-lg">강사</h2>
          <CourseSectionBones lines={2} />
        </section>
      ) : course.instructor ? (
        <section className="mt-10">
          <h2 className="text-title-lg">강사</h2>
          <p className="mt-2 text-body">
            {course.instructor.name}
            {course.instructor.title ? (
              <span className="ml-2 text-body-sm text-muted-foreground">
                {course.instructor.title}
              </span>
            ) : null}
          </p>
          {course.instructor.bio ? (
            <p className="mt-1 text-body-sm text-soft-foreground">
              {course.instructor.bio}
            </p>
          ) : null}
        </section>
      ) : null}

      {course.description === undefined ? (
        <section className="mt-10">
          <h2 className="text-title-lg">강의 소개</h2>
          <CourseSectionBones />
        </section>
      ) : course.description ? (
        <section className="mt-10">
          <h2 className="text-title-lg">강의 소개</h2>
          <div
            className="mt-2 text-body"
            dangerouslySetInnerHTML={{ __html: course.description }}
          />
        </section>
      ) : null}

      {course.sections === undefined ? (
        <CurriculumBones />
      ) : (
        <CurriculumSection sections={course.sections} />
      )}
      <ReviewsSection courseId={course.id} />
    </main>
  );
}
