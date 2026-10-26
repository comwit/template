"use server";
import { createAction } from "@/lib/utils";
import type * as Types from "../types";
import * as input from "@/lib/commerce";
import { commerceAction, presentProduct } from "@/server/commerce";
import { catalogRepository } from "@/server/repository";
import { requireAdmin } from "@/server/auth";
async function _find(id: string): Promise<Types.ProductView> {
  return commerceAction(async () => {
    await requireAdmin();
    return presentProduct(
      await catalogRepository.findById(input.entityId.parse(id)),
    );
  });
}
export const find = createAction(_find);
