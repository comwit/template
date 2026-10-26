"use server";
import { createAction } from "@/lib/utils";
import type * as Types from "../types";
import * as input from "@/lib/commerce";
import { commerceAction, presentOrder } from "@/server/commerce";
import { operationsRepository } from "@/server/repository";
import { requireAdmin } from "@/server/auth";
async function _summary(): Promise<Types.DashboardView> {
  return commerceAction(async () => {
    await requireAdmin();
    const result = await operationsRepository.dashboard();
    return {
      products: result.products,
      orders: result.orders,
      grossLabel: input.formatMoney(result.gross),
      netLabel: input.formatMoney(result.gross - result.refunded),
      refundedLabel: input.formatMoney(result.refunded),
      lowStock: result.lowStock,
      needsReview: result.needsReview,
      recent: result.recent.map(presentOrder),
    };
  });
}
export const summary = createAction(_summary);
