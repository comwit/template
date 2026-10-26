import { action } from "@comwit/state";
import { adminOrders as api } from "@/services/admin/api/orders";
import { mutate, newRequestKey } from "@/lib/commerce-state";
import { popup } from "@/lib/popup";
import type {
  ListFilter,
  ShipmentInput,
  RefundInput,
  StockInput,
} from "@/lib/commerce";
import type { DomainActions } from "../types";
import { adminPayments } from "@/services/admin/api/payments";
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
    }
    async cancel(id: string): Promise<void> {
      if (
        !(await popup.confirm({
          title: "미결제 주문을 취소할까요?",
          description: "예약 중인 재고가 해제됩니다.",
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
    async ship(request: ShipmentInput): Promise<void> {
      await mutate(
        this.model,
        async () => {
          await api.ship(request);
          await this.refresh();
        },
        "송장을 등록했습니다.",
      );
    }
    async deliver(id: string): Promise<void> {
      if (
        !(await popup.confirm({
          title: "배송 완료로 처리할까요?",
          description: "상품이 고객에게 전달된 것을 확인해주세요.",
        }))
      )
        return;
      await mutate(
        this.model,
        async () => {
          await api.deliver(id);
          await this.refresh();
        },
        "배송 완료로 처리했습니다.",
      );
    }
    async refund(request: Omit<RefundInput, "requestKey">): Promise<void> {
      if (
        !(await popup.confirm({
          title: "선택한 항목을 환불할까요?",
          description: request.restock
            ? "반품 입고 수량도 재고에 반영합니다."
            : "재고 입고 없이 결제 금액을 환불합니다.",
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
