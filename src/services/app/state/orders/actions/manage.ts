import { action } from "@comwit/state";
import { customerOrders as api } from "@/services/app/api/orders";
import { mutate } from "@/lib/commerce-state";
import { popup } from "@/lib/popup";
import type {
  ListFilter,
  ShipmentInput,
  RefundInput,
  StockInput,
} from "@/lib/commerce";
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
  }
  return new ManageActions();
});
