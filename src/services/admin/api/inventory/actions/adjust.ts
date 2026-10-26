"use server";
import { createAction } from "@/lib/utils";
import type * as Types from "../types";
import * as input from "@/lib/commerce";
import { commerceAction } from "@/server/commerce";
import { catalogRepository } from "@/server/repository";
import { requireAdmin } from "@/server/auth";
async function _adjust(request: Types.StockInput): Promise<void> {
  return commerceAction(async () => {
    const actor = await requireAdmin();
    await catalogRepository.adjustStock(
      input.stockSchema.parse(request),
      actor.id,
    );
  });
}
export const adjust = createAction(_adjust);
