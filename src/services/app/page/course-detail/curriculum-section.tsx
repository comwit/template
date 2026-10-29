"use client";

import { useState } from "react";
import type { SectionView } from "@/services/app/state/catalog";
import { Button } from "@/lib/components/ui/button";
import { LessonPlayer } from "@/services/app/page/learn/lesson-player";

/**
 * 커리큘럼. 상태를 읽지 않는 순수 섹션 — 미리보기 레슨은 "미리보기" 버튼으로 LessonPlayer 를 인라인으로 연다.
 * 공개 상세에선 미리보기 레슨만 video 가 채워져 있다(수강 중이면 전부).
 */
export function CurriculumSection({ sections }: { sections: SectionView[] }) {
  const [previewId, setPreviewId] = useState<string | null>(null);
  if (sections.length === 0) return null;
  return (
    <section className="mt-10">
      <h2 className="text-title-lg">커리큘럼</h2>
      <ol className="mt-2 flex flex-col gap-4">
        {sections.map((section) => (
          <li key={section.id}>
            <p className="text-title-md">
              {section.title}
              <span className="ml-2 text-body-sm text-muted-foreground">
                {section.durationLabel}
              </span>
            </p>
            <ol className="mt-1 flex flex-col gap-1">
              {section.lessons.map((lesson) => (
                <li key={lesson.id} className="text-body">
                  <span>{lesson.title}</span>
                  <span className="ml-2 text-body-sm text-muted-foreground">
                    {lesson.durationLabel}
                  </span>
                  {lesson.isPreview && lesson.video ? (
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      onClick={() =>
                        setPreviewId(previewId === lesson.id ? null : lesson.id)
                      }
                    >
                      {previewId === lesson.id ? "닫기" : "미리보기"}
                    </Button>
                  ) : null}
                  {previewId === lesson.id && lesson.video ? (
                    <div className="mt-2 max-w-2xl">
                      <LessonPlayer key={lesson.id} video={lesson.video} />
                    </div>
                  ) : null}
                </li>
              ))}
            </ol>
          </li>
        ))}
      </ol>
    </section>
  );
}
