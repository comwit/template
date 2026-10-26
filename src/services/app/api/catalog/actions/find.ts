"use server";
import { createAction } from "@/lib/utils";
import type * as Types from "../types";
import * as input from "@/lib/commerce";
import { commerceAction, presentProduct } from "@/server/commerce";
import { catalogRepository, orderRepository } from "@/server/repository";
async function _find(id: string): Promise<Types.ProductView> {
  return commerceAction(async () => {
    await orderRepository.expirePending();
    return presentProduct(
      await catalogRepository.findById(input.entityId.parse(id), true),
    );
  });
}
export const find = createAction(_find);
