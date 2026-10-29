"use server";
import { createAction } from "@/lib/utils";
import * as input from "@/lib/course";
import { courseAction } from "@/server/course";
import { paymentRepository } from "@/server/repository";
import { requireAdmin } from "@/server/auth";
async function _retryRefund(refundId: string): Promise<string> {
  return courseAction(async () => {
    await requireAdmin();
    return paymentRepository.retryRefund(input.entityId.parse(refundId));
  });
}
export const retryRefund = createAction(_retryRefund);
