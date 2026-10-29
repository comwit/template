import type { AdminPaymentsAPI } from "@/services/admin/api/payments";
import { findItem, list, mockApi } from "../runtime";
export const adminPayments = {
  findAll: mockApi<AdminPaymentsAPI["findAll"]>((db, filter, page) =>
    list(db.payments, filter, page),
  ),
  reconcile: mockApi<AdminPaymentsAPI["reconcile"]>(
    (db, id) => findItem(db.payments, id).status,
  ),
  reconcilePending: mockApi<AdminPaymentsAPI["reconcilePending"]>(() => ({
    succeeded: 0,
    failed: 0,
  })),
  retryRefund: mockApi<AdminPaymentsAPI["retryRefund"]>((db, refundId) => {
    for (const payment of db.payments)
      if (payment.pendingRefundId === refundId) payment.pendingRefundId = null;
    for (const order of db.orders) {
      const refund = order.refunds.find((item) => item.id === refundId);
      if (refund) Object.assign(refund, { status: "succeeded", statusLabel: "완료" });
      if (order.payment?.pendingRefundId === refundId)
        order.payment.pendingRefundId = null;
    }
    return "succeeded";
  }),
} satisfies AdminPaymentsAPI;
