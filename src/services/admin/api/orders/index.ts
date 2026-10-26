import { resolveActions } from "@/lib/utils";
export * from "./types";
import { findAll } from "./actions/find-all";
import { find } from "./actions/find";
import { cancel } from "./actions/cancel";
import { ship } from "./actions/ship";
import { deliver } from "./actions/deliver";
import { refund } from "./actions/refund";
import { expire } from "./actions/expire";
export const adminOrders = resolveActions({
  findAll,
  find,
  cancel,
  ship,
  deliver,
  refund,
  expire,
});
