import { action } from "@comwit/state";
import { catalog as api } from "@/services/app/api/catalog";
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
// 상세는 액션으로 채우지 않는다: 카드는 평범한 링크고, detail 의 `seed` 가 목록에서 첫 화면을 만든다(model.ts).
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
