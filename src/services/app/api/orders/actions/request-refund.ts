"use server";
import { createAction } from "@/lib/utils";
import type * as Types from "../types";
import * as input from "@/lib/course";
import { courseAction } from "@/server/course";
import { paymentRepository } from "@/server/repository";
import { requireCustomer } from "@/server/auth";
async function _requestRefund(request: Types.RefundRequestInput): Promise<string> {
  return courseAction(async () => {
    const actor = await requireCustomer();
    return paymentRepository.createRefundRequest(
      input.refundRequestSchema.parse(request),
      actor.id,
    );
  });
}
export const requestRefund = createAction(_requestRefund);
