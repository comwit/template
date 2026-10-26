"use server";
import { createAction } from "@/lib/utils";
import type * as Types from "../types";
import * as input from "@/lib/commerce";
import { commerceAction, presentOrderDetail } from "@/server/commerce";
import { orderRepository } from "@/server/repository";
import { requireAdmin } from "@/server/auth";
async function _find(id: string): Promise<Types.OrderView> {
  return commerceAction(async () => {
    await requireAdmin();
    return presentOrderDetail(
      await orderRepository.findById(input.entityId.parse(id)),
      true,
    );
  });
}
export const find = createAction(_find);
