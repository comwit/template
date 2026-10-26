import { resolveActions } from "@/lib/utils";
export * from "./types";
import { findAll } from "./actions/find-all";
import { reconcile } from "./actions/reconcile";
import { retry } from "./actions/retry";
import { processPending } from "./actions/process-pending";
export const adminNotifications = resolveActions({
  findAll,
  reconcile,
  retry,
  processPending,
});
