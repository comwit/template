"use server";
import { createAction } from "@/lib/utils";
import type * as Types from "../types";
import * as input from "@/lib/course";
import { courseAction } from "@/server/course";
import { paymentRepository } from "@/server/repository";
import { requireAdmin } from "@/server/auth";
async function _refund(request: Types.RefundInput): Promise<string> {
  return courseAction(async () => {
    const actor = await requireAdmin();
    return paymentRepository.requestRefund(
      input.refundSchema.parse(request),
      actor.id,
    );
  });
}
export const refund = createAction(_refund);
