"use client";

import Link from "next/link";
import type { SectionView, LessonProgressView } from "@/services/app/state/enrollments";

/**
 * 강의실 레슨 목록. 상태를 읽지 않는 순수 섹션 — 섹션 → 레슨, 완료 체크, 길이, 현재 레슨 표시.
 * 레슨 전환은 Link(`/learn/[courseId]/[lessonId]`)로 하고 저장은 부모(index)가 레슨 바뀔 때 처리한다.
 */
export function LessonList({
  courseId,
  sections,
  progress,
  currentId,
}: {
  courseId: string;
  sections: SectionView[];
  progress: LessonProgressView[];
  currentId: string | null;
}) {
  const completed = new Set(
    progress.filter((entry) => entry.completed).map((entry) => entry.lessonId),
  );
  return (
    <nav aria-label="레슨 목록">
      <ol className="flex flex-col gap-3">
        {sections.map((section) => (
          <li key={section.id}>
            <p className="text-title-sm">
              {section.title}
              <span className="ml-2 text-body-sm text-muted-foreground">
                {section.durationLabel}
              </span>
            </p>
            <ol className="mt-1 flex flex-col gap-1">
              {section.lessons.map((lesson) => (
                <li key={lesson.id}>
                  <Link
                    href={`/learn/${courseId}/${lesson.id}`}
                    aria-current={lesson.id === currentId ? "page" : undefined}
                    className={
                      lesson.id === currentId
                        ? "block font-semibold underline"
                        : "block"
                    }
                  >
                    <span className="mr-1" aria-hidden="true">
                      {completed.has(lesson.id) ? "✓" : "○"}
                    </span>
                    {lesson.title}
                    <span className="ml-2 text-body-sm text-muted-foreground">
                      {lesson.durationLabel}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </li>
        ))}
      </ol>
    </nav>
  );
}
