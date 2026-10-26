"use server";
import { createAction } from "@/lib/utils";
import type * as Types from "../types";
import type { PageRequest, Pageable } from "@/server/repository/types";
import * as input from "@/lib/commerce";
import { commerceAction, presentOrder } from "@/server/commerce";
import { orderRepository } from "@/server/repository";
import { requireCustomer } from "@/server/auth";
async function _findAll(
  filter: Types.ListFilter,
  pageable: PageRequest,
): Promise<Pageable<Types.OrderSummary>> {
  return commerceAction(async () => {
    const actor = await requireCustomer();
    const result = await orderRepository.findAll(
      input.listFilterSchema.parse(filter),
      input.pageSchema.parse(pageable),
      actor.id,
    );
    return { ...result, items: result.items.map(presentOrder) };
  });
}
export const findAll = createAction(_findAll);
