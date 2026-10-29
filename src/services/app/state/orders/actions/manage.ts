import { action } from "@comwit/state";
import { orders as api } from "@/services/app/api/orders";
import { mutate } from "@/lib/course-state";
import { popup } from "@/lib/popup";
import type { DomainActions } from "../types";
import { domain } from "../model";
export const manageActions = action<DomainActions>(({ state }) => {
  class ManageActions {
    private model = state(domain);
    setPage(page: number) {
      this.model.page = page;
    }
    async refresh() {
      await Promise.all([
        this.model.list.refetch(),
        this.model.detail.refetch(),
      ]);
    }
    async cancel(id: string): Promise<void> {
      if (
        !(await popup.confirm({
          title: "미결제 주문을 취소할까요?",
          description: "취소한 주문은 되돌릴 수 없습니다. 다시 수강 신청할 수 있습니다.",
        }))
      )
        return;
      await mutate(
        this.model,
        async () => {
          await api.cancel(id);
          await this.refresh();
        },
        "주문을 취소했습니다.",
      );
    }
    async requestRefund(orderId: string, reason: string): Promise<void> {
      await mutate(
        this.model,
        async () => {
          await api.requestRefund({ orderId, reason });
          await this.refresh();
        },
        "환불을 신청했습니다.",
      );
    }
  }
  return new ManageActions();
});
