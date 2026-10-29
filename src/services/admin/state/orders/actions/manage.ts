import { action } from "@comwit/state";
import { adminOrders as api } from "@/services/admin/api/orders";
import { adminPayments } from "@/services/admin/api/payments";
import { mutate, newRequestKey } from "@/lib/course-state";
import { popup } from "@/lib/popup";
import type { ListFilter, RefundInput } from "@/lib/course";
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
      await this.model.detail.refetch();
    }
    select(id: string | null): void {
      this.model.selectedId = id;
      this.model.error = null;
    }
    async cancel(id: string): Promise<void> {
      if (
        !(await popup.confirm({
          title: "미결제 주문을 취소할까요?",
          description: "수강생은 다시 결제해야 수강할 수 있습니다.",
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
    async refund(request: Omit<RefundInput, "requestKey">): Promise<void> {
      if (
        !(await popup.confirm({
          title: "결제 금액 전액을 환불할까요?",
          description: "환불과 함께 수강 권한이 회수됩니다.",
          destructive: true,
        }))
      )
        return;
      await mutate(
        this.model,
        async () => {
          const old = this.model.pendingRefund;
          if (
            !old ||
            JSON.stringify({ ...old, requestKey: undefined }) !==
              JSON.stringify(request)
          )
            this.model.pendingRefund = {
              ...request,
              requestKey: newRequestKey(),
            };
          await api.refund(this.model.pendingRefund!);
          this.model.pendingRefund = null;
          await this.refresh();
        },
        "환불을 처리했습니다.",
      );
    }
    async retryRefund(id: string) {
      await mutate(
        this.model,
        async () => {
          await adminPayments.retryRefund(id);
          await this.refresh();
        },
        "환불 상태를 확인했습니다.",
      );
    }
    async expire(): Promise<void> {
      await mutate(
        this.model,
        async () => {
          await api.expire();
          await this.refresh();
        },
        "만료된 주문을 정리했습니다.",
      );
    }
  }
  return new ManageActions();
});
