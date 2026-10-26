import { action } from "@comwit/state";
import { adminInventory as api } from "@/services/admin/api/inventory";
import { mutate, newRequestKey } from "@/lib/commerce-state";
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
    }
    select(id: string | null): void {
      this.model.selectedId = id;
    }
    async adjust(request: Omit<StockInput, "requestKey">): Promise<void> {
      const old = this.model.pendingAdjustment;
      if (
        !old ||
        old.skuId !== request.skuId ||
        old.quantity !== request.quantity ||
        old.reason !== request.reason
      )
        this.model.pendingAdjustment = {
          ...request,
          requestKey: newRequestKey(),
        };
      await mutate(
        this.model,
        async () => {
          await api.adjust(this.model.pendingAdjustment!);
          this.model.pendingAdjustment = null;
          await this.refresh();
          await this.model.movements.refetch();
        },
        "재고를 조정했습니다.",
      );
    }
  }
  return new ManageActions();
});
