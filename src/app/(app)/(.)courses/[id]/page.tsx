import { Suspense } from "react";
import { CourseDetailSkeleton } from "@/services/app/page/course-detail";
import { InterceptedCourseDetail } from "@/services/app/page/course-detail/intercepted";

/**
 * 인터셉트 라우트 `(app)/(.)courses/[id]` — `(app)` 레이아웃이 떠 있는 어디서든(홈·목록·내 강의실)
 * `/courses/[id]` 로 소프트 내비하면 정식 라우트 대신 이게 뜬다.
 *
 * 서버 데이터를 읽지 않는 정적 페이지라 기본 `<Link>` prefetch(App Shell)에 페이지 전체가 들어가고,
 * 내비 때 서버 왕복이 없다. 카드가 `useCatalog` 의 `actions.open(course)` 으로 detail 캐시를 채워 두면
 * CourseDetail 의 `.suspend(id)` 가 기다리지 않고 바로 그린다. 캐시가 없으면 스켈레톤 뒤 클라에서 받는다.
 *
 * 직접 진입·새로고침·공유 링크·봇은 인터셉션을 타지 않고 정식 `courses/[id]`(404 판단·metadata·SSR)로 간다.
 * 이 파일에 서버 조회·`await params`·metadata 를 넣으면 즉시성이 사라진다 — 그런 건 정식 라우트에만 둔다.
 */
export default function InterceptedCoursePage() {
  return (
    <Suspense fallback={<CourseDetailSkeleton />}>
      <InterceptedCourseDetail />
    </Suspense>
  );
}
