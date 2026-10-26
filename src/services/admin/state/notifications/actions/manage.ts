import { action } from "@comwit/state";
import { adminNotifications as api } from "@/services/admin/api/notifications";
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
    async reconcile(id: string): Promise<void> {
      await mutate(
        this.model,
        async () => {
          await api.reconcile(id);
          await this.refresh();
        },
        "알림 결과를 조회했습니다.",
      );
    }
    async retry(id: string): Promise<void> {
      const confirmed = await popup.confirm({
        title: "알림 재발송",
        description: "동일한 내용이 다시 발송되며 발송 요금이 발생합니다.",
        confirmText: "재발송",
      });
      if (!confirmed) return;
      await mutate(
        this.model,
        async () => {
          await api.retry(id);
          await this.refresh();
        },
        "재발송을 요청했습니다.",
      );
    }
    async processPending(): Promise<void> {
      await mutate(
        this.model,
        async () => {
          const result = await api.processPending();
          await this.refresh();
          if (result.failed)
            throw new Error(`${result.failed}건은 추가 확인이 필요합니다.`);
        },
        "대기 알림을 처리했습니다.",
      );
    }
  }
  return new ManageActions();
});
