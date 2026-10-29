"use server";
import { createAction } from "@/lib/utils";
import type * as Types from "../types";
import type { PageRequest, Pageable } from "@/server/repository/types";
import * as input from "@/lib/course";
import { courseAction, presentOrder } from "@/server/course";
import { orderRepository } from "@/server/repository";
import { requireCustomer } from "@/server/auth";
async function _findAll(pageable: PageRequest): Promise<Pageable<Types.OrderSummary>> {
  return courseAction(async () => {
    const actor = await requireCustomer();
    const result = await orderRepository.findAll(
      { search: "", status: "" },
      input.pageSchema.parse(pageable),
      actor.id,
    );
    return { ...result, items: result.items.map(presentOrder) };
  });
}
export const findAll = createAction(_findAll);
