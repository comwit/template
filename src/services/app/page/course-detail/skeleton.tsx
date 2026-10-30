"use client";

import { Skeleton } from "@/lib/components/ui/skeleton";

/**
 * 상세 라우트 두 곳(정식·인터셉트)의 Suspense fallback. state·캐시를 읽지 않는 순수 UI(page.ai.md).
 * 파생 프로젝트는 자기 상세 구조에 맞게 뼈대만 바꾼다.
 */
export function CourseDetailSkeleton() {
  return (
    <main
      aria-busy="true"
      className="mx-auto w-full max-w-5xl px-6 py-16"
    >
      <Skeleton className="h-4 w-20" />
      <Skeleton className="mt-3 h-8 w-3/4" />
      <Skeleton className="mt-3 h-6 w-28" />
      <div className="mt-8 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <div className="mt-8 space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </main>
  );
}

/**
 * 상세 리소스가 목록 시드만 가진 동안(상세 전용 필드가 `undefined`) 그 자리만 채우는 뼈대.
 * 시드로 이미 그린 제목·가격 등은 그대로 두고, 응답이 오면 같은 자리에 실제 섹션이 들어간다.
 */
export function CourseActionBones() {
  return <Skeleton aria-hidden className="h-9 w-36" />;
}

export function CourseSectionBones({ lines = 3 }: { lines?: number }) {
  return (
    <div aria-hidden className="mt-2 space-y-2">
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton
          key={index}
          className={index === lines - 1 ? "h-4 w-2/3" : "h-4 w-full"}
        />
      ))}
    </div>
  );
}

export function CurriculumBones() {
  return (
    <section aria-busy="true" className="mt-10">
      <Skeleton className="h-6 w-24" />
      <div className="mt-2 space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </section>
  );
}
