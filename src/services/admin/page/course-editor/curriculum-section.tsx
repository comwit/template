"use client";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/lib/components/ui/button";
import { Input } from "@/lib/components/ui/input";
import { TextField } from "@/lib/components/ui/text-field";
import { EmptyState } from "@/lib/components/ui/empty-state";
import { AdminSection } from "@/services/admin/_components";
import { IconAction } from "@/services/admin/_components/course";
import type {
  CourseInput,
  SectionInput,
  LessonInput,
} from "@/services/admin/state/courses";
import { LessonEditor } from "./lesson-editor";
export type CurriculumSectionProps = {
  draft: CourseInput;
  busy: boolean;
  onAddSection(): void;
  onRemoveSection(index: number): void;
  onMoveSection(index: number, direction: -1 | 1): void;
  onUpdateSection(index: number, patch: Partial<SectionInput>): void;
  onAddLesson(sectionIndex: number): void;
  onRemoveLesson(sectionIndex: number, lessonIndex: number): void;
  onMoveLesson(sectionIndex: number, lessonIndex: number, direction: -1 | 1): void;
  onUpdateLesson(
    sectionIndex: number,
    lessonIndex: number,
    patch: Partial<LessonInput>,
  ): void;
};
export function CurriculumSection(props: CurriculumSectionProps) {
  const sections = props.draft.sections;
  const lessonCount = sections.reduce((n, s) => n + s.lessons.length, 0);
  return (
    <AdminSection
      title="커리큘럼"
      meta={`섹션 ${sections.length} · 레슨 ${lessonCount}`}
      action={
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={props.onAddSection}
          disabled={props.busy || sections.length >= 50}
        >
          <Plus className="size-4" aria-hidden="true" />
          섹션 추가
        </Button>
      }
    >
      {sections.length === 0 ? (
        <EmptyState
          title="섹션이 없습니다"
          description="섹션을 추가하고 레슨을 넣으세요. 레슨이 있어야 공개할 수 있습니다."
        />
      ) : null}
      {sections.map((section, si) => {
        const name = `섹션 ${si + 1}`;
        return (
          <div
            key={section.id ?? `new-${si}`}
            className="space-y-3 rounded-card bg-muted/50 p-3"
          >
            <div className="flex items-end gap-2">
              <TextField label={name} className="flex-1" required>
                <Input
                  value={section.title}
                  maxLength={120}
                  placeholder="섹션 제목"
                  onChange={(e) =>
                    props.onUpdateSection(si, { title: e.target.value })
                  }
                  required
                />
              </TextField>
              <IconAction
                icon={ArrowUp}
                label={`${name} 위로`}
                onClick={() => props.onMoveSection(si, -1)}
                disabled={props.busy || si === 0}
              />
              <IconAction
                icon={ArrowDown}
                label={`${name} 아래로`}
                onClick={() => props.onMoveSection(si, 1)}
                disabled={props.busy || si === sections.length - 1}
              />
              <IconAction
                icon={Trash2}
                label={`${name} 삭제`}
                onClick={() => props.onRemoveSection(si)}
                disabled={props.busy}
              />
            </div>
            {section.lessons.map((lesson, li) => (
              <LessonEditor
                key={lesson.id ?? `new-${li}`}
                lesson={lesson}
                index={li}
                count={section.lessons.length}
                busy={props.busy}
                onChange={(patch) => props.onUpdateLesson(si, li, patch)}
                onMove={(direction) => props.onMoveLesson(si, li, direction)}
                onRemove={() => props.onRemoveLesson(si, li)}
              />
            ))}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => props.onAddLesson(si)}
              disabled={props.busy || section.lessons.length >= 200}
            >
              <Plus className="size-4" aria-hidden="true" />
              레슨 추가
            </Button>
          </div>
        );
      })}
    </AdminSection>
  );
}
