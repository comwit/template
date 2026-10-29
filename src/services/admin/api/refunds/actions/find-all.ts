"use server";
import { createAction } from "@/lib/utils";
import type * as Types from "../types";
import type { PageRequest, Pageable } from "@/server/repository/types";
import * as input from "@/lib/course";
import { courseAction, presentRefundRequest } from "@/server/course";
import { paymentRepository } from "@/server/repository";
import { requireAdmin } from "@/server/auth";
async function _findAll(filter: Types.ListFilter, pageable: PageRequest): Promise<Pageable<Types.RefundRequestView>> {
  return courseAction(async () => {
    await requireAdmin();
    const result = await paymentRepository.findRefundRequests(
      input.listFilterSchema.parse(filter),
      input.pageSchema.parse(pageable),
    );
    return {
      ...result,
      items: result.items.map((r) => presentRefundRequest(r.request, r.order)),
    };
  });
}
export const findAll = createAction(_findAll);
