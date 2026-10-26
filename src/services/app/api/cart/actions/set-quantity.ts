"use server";
import { createAction } from "@/lib/utils";
import type * as Types from "../types";
import * as input from "@/lib/commerce";
import { z } from "zod";
import { commerceAction } from "@/server/commerce";
import { cartRepository } from "@/server/repository";
import { requireCustomer } from "@/server/auth";
async function _setQuantity(skuId: string, quantity: number): Promise<void> {
  return commerceAction(async () => {
    const actor = await requireCustomer();
    await cartRepository.setQuantity(
      actor.id,
      input.entityId.parse(skuId),
      z.number().int().min(0).max(99).parse(quantity),
    );
  });
}
export const setQuantity = createAction(_setQuantity);
