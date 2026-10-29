import { action } from "@comwit/state";
import type { ImageAsset } from "@/lib/image";
import type { CourseInput, SectionInput, LessonInput } from "@/lib/course";
import type { DomainActions } from "../types";
import { domain, freshDraft } from "../model";
type DraftActions = Pick<
  DomainActions,
  | "startNew"
  | "updateDraft"
  | "addSection"
  | "removeSection"
  | "moveSection"
  | "updateSection"
  | "addLesson"
  | "removeLesson"
  | "moveLesson"
  | "updateLesson"
  | "setThumbnail"
>;
const swap = <T>(items: T[], index: number, direction: -1 | 1) => {
  const target = index + direction;
  if (target < 0 || target >= items.length) return;
  const [item] = items.splice(index, 1);
  items.splice(target, 0, item);
};
export const draftActions = action<DraftActions>(({ state }) => {
  class Draft {
    private model = state(domain);
    startNew() {
      this.model.draft = freshDraft();
      this.model.editingId = null;
      this.model.error = null;
    }
    updateDraft(patch: Partial<CourseInput>) {
      this.model.draft = { ...this.model.draft, ...patch };
    }
    addSection() {
      this.model.draft.sections.push({ title: "", lessons: [] });
    }
    removeSection(index: number) {
      this.model.draft.sections.splice(index, 1);
    }
    moveSection(index: number, direction: -1 | 1) {
      swap(this.model.draft.sections, index, direction);
    }
    updateSection(index: number, patch: Partial<SectionInput>) {
      const section = this.model.draft.sections[index];
      if (section) Object.assign(section, patch);
    }
    addLesson(sectionIndex: number) {
      this.model.draft.sections[sectionIndex]?.lessons.push({
        title: "",
        video: null,
        durationSeconds: 0,
        isPreview: false,
        content: "",
      });
    }
    removeLesson(sectionIndex: number, lessonIndex: number) {
      this.model.draft.sections[sectionIndex]?.lessons.splice(lessonIndex, 1);
    }
    moveLesson(sectionIndex: number, lessonIndex: number, direction: -1 | 1) {
      const section = this.model.draft.sections[sectionIndex];
      if (section) swap(section.lessons, lessonIndex, direction);
    }
    updateLesson(
      sectionIndex: number,
      lessonIndex: number,
      patch: Partial<LessonInput>,
    ) {
      const lesson = this.model.draft.sections[sectionIndex]?.lessons[lessonIndex];
      if (lesson) Object.assign(lesson, patch);
    }
    setThumbnail(image: ImageAsset | null) {
      // 서버가 돌려준 ImageAsset 을 그대로 둔다(저장 검증이 JSON 문자열을 비교한다).
      this.model.draft.thumbnail = image;
    }
  }
  return new Draft();
});
