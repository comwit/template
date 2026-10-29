import { action } from "@comwit/state";
import { adminReviews as api } from "@/services/admin/api/reviews";
import { mutate } from "@/lib/course-state";
import type { ListFilter } from "@/lib/course";
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
      await this.model.list.refetch();
    }
    select(id: string | null) {
      this.model.error = null;
      this.model.selectedId = id;
    }
    async reply(reviewId: string, reply: string) {
      await mutate(
        this.model,
        async () => {
          await api.reply({ reviewId, reply });
          this.model.selectedId = null;
          await this.refresh();
        },
        reply.trim() ? "답글을 저장했습니다." : "답글을 지웠습니다.",
      );
    }
    async setVisibility(reviewId: string, hidden: boolean) {
      await mutate(
        this.model,
        async () => {
          await api.setVisibility({ reviewId, hidden });
          await this.refresh();
        },
        hidden ? "수강평을 숨겼습니다." : "수강평을 공개했습니다.",
      );
    }
  }
  return new ManageActions();
});
