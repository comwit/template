import { resolveActions } from "@/lib/utils";
export * from "./types";
import { findAll } from "./actions/find-all";
import { find } from "./actions/find";
import { cancel } from "./actions/cancel";
import { requestRefund } from "./actions/request-refund";
export const orders = resolveActions({ findAll, find, cancel, requestRefund });
