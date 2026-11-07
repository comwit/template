"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
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

/**
 * 라우트 `courses/[id]` 의 본문. 라우트 파일은 정적 Server Component 로 두고(src/app/.ai.md → Data routes)
 * URL 의 id 는 서버 params 가 아니라 여기서 `useParams` 로 읽는다. 그래야 본문이 서버 왕복 없이 바로 그려진다.
 */
export function CourseDetailRoute() {
  const { id } = useParams<{ id: string }>();
  return <CourseDetail courseId={id} />;
}

// 빈 깡통. 파생 프로젝트에서 섹션 파일로 나눠 채운다(page.ai.md).
// 읽는 상태: useCatalog detail(.suspend(courseId)) — 리소스 하나, `.suspend` 하나. 수강평은 reviews-section 이 별도 query 로 지연 로드한다.
//
// 진입 셋이 같은 `.suspend(id)` 한 줄을 탄다. 무엇을 그릴지는 모델의 `seed` 가 정한다(state.ai.md → Detail seed).
//   - 직접 진입·새로고침·공유·봇: suspend → 같은 요청에서 SSR(SEO), 결과가 클라 캐시로 스트리밍. 전체 필드(CourseView).
//   - 목록에서 소프트 내비: 목록 항목(CourseSummary)이 seed 라 기다리지 않고 제목·가격·요약을 바로 그린다(`isPartial: true`).
//     상세 전용 영역(소개·강사·커리큘럼·수강 여부)만 뼈대이고, 커밋 뒤 전체 응답이 오면 덮는다.
//   - 목록 데이터 없는 소프트 내비(학습 화면 → 강의 등): 라우트의 CourseDetailSkeleton 뒤 클라에서 받는다.
// `data === null` 은 없는·비공개 강의(API 가 null 을 돌려준다). 업그레이드 실패(`isError`)는 seed 내용을 지우지 않고 재시도만 보여 준다.
export default function CourseDetail({ courseId }: { courseId: string }) {
  const catalog = useCatalog((state) => ({
    detail: state.detail.suspend(courseId),
    actions: state.actions,
  }));
  const course = catalog.detail.data;
  if (!course) return <CourseNotFound />;
  // 전체(CourseView)면 값, seed 만 있으면 null. 상세 전용 영역은 필드 유무가 아니라 이 값으로 분기한다.
  const full = catalog.detail.isPartial ? null : catalog.detail.data;
  const bones = !full && !catalog.detail.isError;

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
        {full ? (
          full.enrollment ? (
            <Button asChild>
              <Link href={`/learn/${course.id}`}>
                이어서 수강하기 ({full.enrollment.progressPercent}%)
              </Link>
            </Button>
          ) : (
            <Button asChild>
              <Link href={`/checkout/course/${course.id}`}>
                {siteText.pages["checkout"]}
              </Link>
            </Button>
          )
        ) : bones ? (
          <CourseActionBones />
        ) : (
          // 업그레이드 실패. 목록에서 온 내용은 그대로 두고 상세 전용 영역만 다시 받는다.
          <p className="flex items-center gap-2 text-body-sm text-destructive">
            상세 정보를 불러오지 못했습니다.
            <Button
              variant="link"
              size="sm"
              onClick={() => catalog.actions.refreshDetail()}
            >
              다시 시도
            </Button>
          </p>
        )}
      </div>

      {full ? (
        full.instructor ? (
          <section className="mt-10">
            <h2 className="text-title-lg">강사</h2>
            <p className="mt-2 text-body">
              {full.instructor.name}
              {full.instructor.title ? (
                <span className="ml-2 text-body-sm text-muted-foreground">
                  {full.instructor.title}
                </span>
              ) : null}
            </p>
            {full.instructor.bio ? (
              <p className="mt-1 text-body-sm text-soft-foreground">
                {full.instructor.bio}
              </p>
            ) : null}
          </section>
        ) : null
      ) : bones ? (
        <section className="mt-10">
          <h2 className="text-title-lg">강사</h2>
          <CourseSectionBones lines={2} />
        </section>
      ) : null}

      {full ? (
        full.description ? (
          <section className="mt-10">
            <h2 className="text-title-lg">강의 소개</h2>
            <div
              className="mt-2 text-body"
              dangerouslySetInnerHTML={{ __html: full.description }}
            />
          </section>
        ) : null
      ) : bones ? (
        <section className="mt-10">
          <h2 className="text-title-lg">강의 소개</h2>
          <CourseSectionBones />
        </section>
      ) : null}

      {full ? (
        <CurriculumSection sections={full.sections} />
      ) : bones ? (
        <CurriculumBones />
      ) : null}
      <ReviewsSection courseId={courseId} />
    </main>
  );
}
