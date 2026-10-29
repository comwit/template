import { resolveActions } from "@/lib/utils";
export * from "./types";
import { findAll } from "./actions/find-all";
import { reconcile } from "./actions/reconcile";
import { reconcilePending } from "./actions/reconcile-pending";
import { retryRefund } from "./actions/retry-refund";
export const adminPayments = resolveActions({ findAll, reconcile, reconcilePending, retryRefund });
