"use server";
import { createAction } from "@/lib/utils";
import type * as Types from "../types";
import type { PageRequest, Pageable } from "@/server/repository/types";
import * as input from "@/lib/course";
import { courseAction, presentPaymentRow } from "@/server/course";
import { paymentRepository } from "@/server/repository";
import { requireAdmin } from "@/server/auth";
async function _findAll(filter: Types.ListFilter, pageable: PageRequest): Promise<Pageable<Types.PaymentRowView>> {
  return courseAction(async () => {
    await requireAdmin();
    const result = await paymentRepository.findAll(
      input.listFilterSchema.parse(filter),
      input.pageSchema.parse(pageable),
    );
    return { ...result, items: result.items.map(presentPaymentRow) };
  });
}
export const findAll = createAction(_findAll);
