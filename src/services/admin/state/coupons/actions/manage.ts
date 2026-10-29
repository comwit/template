import { action } from "@comwit/state";
import { adminCoupons as api } from "@/services/admin/api/coupons";
import { mutate } from "@/lib/course-state";
import type { ListFilter, CouponInput, CouponView } from "@/lib/course";
import type { DomainActions } from "../types";
import { domain, freshDraft, draftFromView } from "../model";
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
    openNew() {
      this.model.draft = freshDraft();
      this.model.error = null;
      this.model.editorOpen = true;
    }
    /** 목록 행에서 바로 편집한다 (단건 조회 API 없음). */
    edit(coupon: CouponView) {
      this.model.draft = draftFromView(coupon);
      this.model.error = null;
      this.model.editorOpen = true;
    }
    close() {
      if (!this.model.isSaving) this.model.editorOpen = false;
    }
    setDraft(draft: CouponInput) {
      this.model.draft = draft;
    }
    async save() {
      await mutate(
        this.model,
        async () => {
          await api.save(this.model.draft);
          this.model.editorOpen = false;
          await this.refresh();
        },
        "쿠폰을 저장했습니다.",
      );
    }
    async setActive(id: string, active: boolean) {
      await mutate(
        this.model,
        async () => {
          await api.setActive(id, active);
          await this.refresh();
        },
        active ? "쿠폰을 활성화했습니다." : "쿠폰을 중지했습니다.",
      );
    }
  }
  return new ManageActions();
});
