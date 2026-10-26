"use server";
import { createAction } from "@/lib/utils";
import type * as Types from "../types";
import type { PageRequest, Pageable } from "@/server/repository/types";
import * as input from "@/lib/commerce";
import { commerceAction, presentProduct } from "@/server/commerce";
import { catalogRepository } from "@/server/repository";
import { requireAdmin } from "@/server/auth";
async function _findAll(
  filter: Types.ListFilter,
  pageable: PageRequest,
): Promise<Pageable<Types.ProductView>> {
  return commerceAction(async () => {
    await requireAdmin();
    const result = await catalogRepository.findAll(
      input.listFilterSchema.parse(filter),
      input.pageSchema.parse(pageable),
    );
    return { ...result, items: result.items.map(presentProduct) };
  });
}
export const findAll = createAction(_findAll);
