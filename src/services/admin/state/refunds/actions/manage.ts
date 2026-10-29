import { action } from "@comwit/state";
import { adminRefunds as api } from "@/services/admin/api/refunds";
import { mutate, newRequestKey } from "@/lib/course-state";
import type { ListFilter } from "@/lib/course";
import type { DomainActions, DecisionTarget } from "../types";
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
    select(target: DecisionTarget | null) {
      if (this.model.isSaving) return;
      this.model.selected = target;
      this.model.error = null;
    }
    /** 승인은 서버에서 토스 환불까지 수행하므로 requestKey 를 성공 전까지 유지한다. */
    async decide(note: string): Promise<void> {
      const target = this.model.selected;
      if (!target) return;
      const request = {
        requestId: target.id,
        approve: target.approve,
        note: note.trim(),
      };
      await mutate(
        this.model,
        async () => {
          const old = this.model.pendingDecision;
          if (
            !old ||
            JSON.stringify({ ...old, requestKey: undefined }) !==
              JSON.stringify(request)
          )
            this.model.pendingDecision = {
              ...request,
              requestKey: newRequestKey(),
            };
          await api.decide(this.model.pendingDecision!);
          this.model.pendingDecision = null;
          this.model.selected = null;
          await this.refresh();
        },
        target.approve
          ? "환불을 승인하고 결제를 취소했습니다."
          : "환불 신청을 거절했습니다.",
      );
    }
  }
  return new ManageActions();
});
