import { action } from "@comwit/state";
import { adminCourses } from "@/services/admin/api/courses";
import { mutate } from "@/lib/course-state";
import { popup } from "@/lib/popup";
import type { ListFilter, CategoryInput, InstructorInput } from "@/lib/course";
import type { DomainActions } from "../types";
import { domain, toDraft } from "../model";
type ManageActions = Pick<
  DomainActions,
  | "setFilter"
  | "setPage"
  | "refresh"
  | "edit"
  | "save"
  | "archive"
  | "saveCategory"
  | "saveInstructor"
  | "removeInstructor"
>;
export const manageActions = action<ManageActions>(({ state }) => {
  class Manage {
    private model = state(domain);
    setFilter(filter: Partial<ListFilter>) {
      this.model.filter = { ...this.model.filter, ...filter };
      this.model.page = 1;
    }
    setPage(page: number) {
      this.model.page = page;
    }
    async refresh() {
      await Promise.all([
        this.model.list.refetch(),
        this.model.categories.refetch(),
        this.model.instructors.refetch(),
      ]);
    }
    /** 상세를 받아 초안으로 바꾼다. save 뒤에도 서버가 매긴 id 를 되돌려 받기 위해 재사용한다. */
    private async loadDraft(id: string) {
      const course = await adminCourses.find(id);
      this.model.draft = toDraft(course);
      this.model.editingId = course.id;
    }
    async edit(id: string) {
      await mutate(this.model, () => this.loadDraft(id));
    }
    async save() {
      let saved: string | null = null;
      await mutate(
        this.model,
        async () => {
          const draft = this.model.draft;
          const request = {
            ...draft,
            slug: draft.slug.trim().toLowerCase(),
            discountPrice:
              draft.discountPrice === null || Number.isNaN(draft.discountPrice)
                ? null
                : draft.discountPrice,
            discountEndsAt: draft.discountEndsAt?.trim() ? draft.discountEndsAt : null,
            sections: draft.sections.map((section) => ({
              ...section,
              lessons: section.lessons.map((lesson) => ({
                ...lesson,
                // 종류만 고르고 주소를 비운 영상은 없음으로 저장한다.
                video: lesson.video?.url.trim() ? lesson.video : null,
              })),
            })),
          };
          saved = await adminCourses.save(request);
          await this.loadDraft(saved);
          await this.model.list.refetch();
        },
        "강의를 저장했습니다.",
      );
      return saved;
    }
    async archive(id: string) {
      if (
        !(await popup.confirm({
          title: "강의를 보관할까요?",
          description: "공개 목록에서 내려가고 기존 수강은 유지됩니다.",
        }))
      )
        return;
      await mutate(
        this.model,
        async () => {
          await adminCourses.archive(id);
          await this.model.list.refetch();
        },
        "강의를 보관했습니다.",
      );
    }
    async saveCategory(input: CategoryInput) {
      let ok = false;
      await mutate(
        this.model,
        async () => {
          await adminCourses.saveCategory({
            ...input,
            slug: input.slug.trim().toLowerCase(),
          });
          ok = true;
          await this.model.categories.refetch();
        },
        "카테고리를 저장했습니다.",
      );
      return ok;
    }
    async saveInstructor(input: InstructorInput) {
      let ok = false;
      await mutate(
        this.model,
        async () => {
          await adminCourses.saveInstructor(input);
          ok = true;
          await this.model.instructors.refetch();
        },
        "강사를 저장했습니다.",
      );
      return ok;
    }
    async removeInstructor(id: string) {
      if (
        !(await popup.confirm({
          title: "강사를 삭제할까요?",
          description: "연결된 강의의 강사 정보가 비워집니다.",
          destructive: true,
        }))
      )
        return;
      await mutate(
        this.model,
        async () => {
          await adminCourses.removeInstructor(id);
          await this.model.instructors.refetch();
        },
        "강사를 삭제했습니다.",
      );
    }
  }
  return new Manage();
});
