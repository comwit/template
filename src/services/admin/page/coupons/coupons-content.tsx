"use client";
import { useAdminCoupons } from "@/services/admin/state/coupons";
import { CouponsSection } from "./coupons-section";
import { CouponEditor } from "./coupon-editor";
export function CouponsContent() {
  const coupons = useAdminCoupons((s) => ({
    list: s.list.load({
      filter: s.filter,
      pageable: { page: s.page, limit: 20 },
    }),
    courses: s.courses.load(),
    filter: s.filter,
    draft: s.draft,
    editorOpen: s.editorOpen,
    busy: s.isSaving,
    error: s.error,
    actions: s.actions,
  }));
  return (
    <>
      <CouponsSection
        query={coupons.list}
        filter={coupons.filter}
        busy={coupons.busy}
        onFilter={coupons.actions.setFilter}
        onPage={coupons.actions.setPage}
        onRefresh={() => void coupons.actions.refresh()}
        onCreate={coupons.actions.openNew}
        onEdit={coupons.actions.edit}
        onToggle={(id, active) => void coupons.actions.setActive(id, active)}
      />
      <CouponEditor
        open={coupons.editorOpen}
        draft={coupons.draft}
        courses={coupons.courses.data}
        busy={coupons.busy}
        error={coupons.error}
        onChange={coupons.actions.setDraft}
        onSave={() => void coupons.actions.save()}
        onClose={coupons.actions.close}
      />
    </>
  );
}
