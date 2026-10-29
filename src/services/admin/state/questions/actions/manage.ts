import { action } from "@comwit/state";
import { adminQuestions as api } from "@/services/admin/api/questions";
import { mutate } from "@/lib/course-state";
import type { ListFilter, QuestionView } from "@/lib/course";
import type { DomainActions } from "../types";
import { domain } from "../model";
export const manageActions = action<DomainActions>(({ state }) => {
  class ManageActions {
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
        this.model.detail.refetch(),
      ]);
    }
    select(id: string | null) {
      this.model.error = null;
      this.model.selectedId = id;
    }
    async answer(questionId: string, content: string) {
      await mutate(
        this.model,
        async () => {
          await api.answer({ questionId, content });
          await this.refresh();
        },
        "답변을 등록했습니다.",
      );
      return this.model.error === null;
    }
    async setStatus(questionId: string, status: QuestionView["status"]) {
      await mutate(
        this.model,
        async () => {
          await api.setStatus({ questionId, status });
          await this.refresh();
        },
        status === "closed" ? "질문을 닫았습니다." : "질문을 다시 열었습니다.",
      );
    }
    async setPinned(questionId: string, pinned: boolean) {
      await mutate(
        this.model,
        async () => {
          await api.setStatus({ questionId, pinned });
          await this.refresh();
        },
        pinned ? "질문을 고정했습니다." : "고정을 해제했습니다.",
      );
    }
  }
  return new ManageActions();
});
