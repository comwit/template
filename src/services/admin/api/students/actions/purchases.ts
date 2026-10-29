"use server";
import { createAction } from "@/lib/utils";
import type * as Types from "../types";
import type { PageRequest, Pageable } from "@/server/repository/types";
import * as input from "@/lib/course";
import { courseAction, presentPurchase } from "@/server/course";
import { purchaseRepository } from "@/server/repository";
import { requireAdmin } from "@/server/auth";
async function _purchases(filter: Types.EnrollmentFilter, pageable: PageRequest): Promise<Pageable<Types.PurchaseView>> {
  return courseAction(async () => {
    await requireAdmin();
    const result = await purchaseRepository.findAll(
      input.enrollmentFilterSchema.parse(filter),
      input.pageSchema.parse(pageable),
    );
    return { ...result, items: result.items.map(presentPurchase) };
  });
}
export const purchases = createAction(_purchases);
