"use server";
import { createAction } from "@/lib/utils";
import type * as Types from "../types";
import type { PageRequest, Pageable } from "@/server/repository/types";
import * as input from "@/lib/course";
import { courseAction, presentPurchase } from "@/server/course";
import { purchaseRepository } from "@/server/repository";
import { requireCustomer } from "@/server/auth";
async function _findAll(pageable: PageRequest): Promise<Pageable<Types.PurchaseView>> {
  return courseAction(async () => {
    const actor = await requireCustomer();
    const result = await purchaseRepository.findByUser(
      actor.id,
      input.pageSchema.parse(pageable),
    );
    return {
      ...result,
      items: (await purchaseRepository.withContents(result.items)).map(presentPurchase),
    };
  });
}
export const findAll = createAction(_findAll);
