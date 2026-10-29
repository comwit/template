import { action } from "@comwit/state";
import { adminPayments as api } from "@/services/admin/api/payments";
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
    async reconcile(id: string): Promise<void> {
      await mutate(
        this.model,
        async () => {
          await api.reconcile(id);
          await this.refresh();
        },
        "결제 상태를 확인했습니다.",
      );
    }
    async retryRefund(id: string): Promise<void> {
      await mutate(
        this.model,
        async () => {
          await api.retryRefund(id);
          await this.refresh();
        },
        "환불 상태를 확인했습니다.",
      );
    }
    async reconcilePending(): Promise<void> {
      await mutate(
        this.model,
        async () => {
          const result = await api.reconcilePending();
          await this.refresh();
          if (result.failed)
            throw new Error(`${result.failed}건은 추가 확인이 필요합니다.`);
        },
        "미확인 결제를 확인했습니다.",
      );
    }
  }
  return new ManageActions();
});
