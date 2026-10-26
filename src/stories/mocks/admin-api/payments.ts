import type { AdminPaymentsAPI } from "@/services/admin/api/payments";
import { findItem, list, mockApi } from "../runtime";
export const adminPayments = {
  findAll: mockApi<AdminPaymentsAPI["findAll"]>((db, filter, page) =>
    list(db.payments, filter, page),
  ),
  reconcile: mockApi<AdminPaymentsAPI["reconcile"]>(
    (db, id) => findItem(db.payments, id).status,
  ),
  retryRefund: mockApi<AdminPaymentsAPI["retryRefund"]>(() => "done"),
  reconcilePending: mockApi<AdminPaymentsAPI["reconcilePending"]>(() => ({
    succeeded: 0,
    failed: 0,
  })),
} satisfies AdminPaymentsAPI;
