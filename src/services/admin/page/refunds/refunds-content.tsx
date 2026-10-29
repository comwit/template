"use client";
import { useAdminRefunds } from "@/services/admin/state/refunds";
import { RefundsSection } from "./refunds-section";
import { DecisionDialog } from "./decision-dialog";
export function RefundsContent() {
  const refunds = useAdminRefunds((s) => ({
    list: s.list.load({
      filter: s.filter,
      pageable: { page: s.page, limit: 20 },
    }),
    filter: s.filter,
    selected: s.selected,
    busy: s.isSaving,
    error: s.error,
    actions: s.actions,
  }));
  const target = refunds.selected
    ? (refunds.list.data.items.find((r) => r.id === refunds.selected!.id) ??
      null)
    : null;
  return (
    <>
      <RefundsSection
        query={refunds.list}
        filter={refunds.filter}
        busy={refunds.busy}
        error={refunds.error}
        onFilter={refunds.actions.setFilter}
        onPage={refunds.actions.setPage}
        onRefresh={() => void refunds.actions.refresh()}
        onDecide={(id, approve) => refunds.actions.select({ id, approve })}
      />
      <DecisionDialog
        key={refunds.selected ? `${refunds.selected.id}-${refunds.selected.approve}` : "none"}
        open={Boolean(refunds.selected && target)}
        approve={refunds.selected?.approve ?? true}
        request={target}
        busy={refunds.busy}
        error={refunds.error}
        onConfirm={(note) => void refunds.actions.decide(note)}
        onClose={() => refunds.actions.select(null)}
      />
    </>
  );
}
