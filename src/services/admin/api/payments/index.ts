import { resolveActions } from "@/lib/utils";
export * from "./types";
import { findAll } from "./actions/find-all";
import { reconcile } from "./actions/reconcile";
import { retryRefund } from "./actions/retry-refund";
import { reconcilePending } from "./actions/reconcile-pending";
export const adminPayments = resolveActions({
  findAll,
  reconcile,
  retryRefund,
  reconcilePending,
});
