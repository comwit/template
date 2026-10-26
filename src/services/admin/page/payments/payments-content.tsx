"use client";
import { useAdminPayments } from "@/services/admin/state/payments";
import { PaymentsSection } from "./payments-section";
export function PaymentsContent() {
  const payment = useAdminPayments((s) => ({
    list: s.list.load({
      filter: s.filter,
      pageable: { page: s.page, limit: 20 },
    }),
    filter: s.filter,
    busy: s.isSaving,
    error: s.error,
    actions: s.actions,
  }));
  return (
    <PaymentsSection
      query={payment.list}
      filter={payment.filter}
      busy={payment.busy}
      error={payment.error}
      onFilter={payment.actions.setFilter}
      onPage={payment.actions.setPage}
      onRefresh={() => void payment.actions.refresh()}
      onReconcile={(id) => void payment.actions.reconcile(id)}
      onRetryRefund={(id) => void payment.actions.retryRefund(id)}
      onReconcilePending={() => void payment.actions.reconcilePending()}
    />
  );
}
