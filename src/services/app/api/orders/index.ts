import { resolveActions } from "@/lib/utils";
export * from "./types";
import { findAll } from "./actions/find-all";
import { find } from "./actions/find";
import { cancel } from "./actions/cancel";
export const customerOrders = resolveActions({ findAll, find, cancel });
