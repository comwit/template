import { action } from "@comwit/state";
import { catalog as api } from "@/services/app/api/catalog";
import { mutate } from "@/lib/commerce-state";
import { popup } from "@/lib/popup";
import type {
  ListFilter,
  ProductView,
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
    /**
     * 카드 → 상세 소프트 내비 직전에 호출한다(`<Link onClick={() => actions.open(product)}>`).
     * 목록 항목이 곧 상세(같은 presentProduct)라 detail 캐시를 채워 두면 인터셉트 라우트의
     * `.suspend(id)` 가 기다리지 않고 바로 그리고, 커밋 뒤 백그라운드로 최신 재고를 다시 받는다.
     */
    open(product: ProductView) {
      this.model.detail.set(product, { arg: product.id });
    }
  }
  return new ManageActions();
});
