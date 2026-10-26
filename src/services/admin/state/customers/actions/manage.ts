import { action } from "@comwit/state";
import { adminCustomers as api } from "@/services/admin/api/customers";
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
    }
  }
  return new ManageActions();
});
