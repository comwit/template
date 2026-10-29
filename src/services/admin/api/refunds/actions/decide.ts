"use server";
import { createAction } from "@/lib/utils";
import type * as Types from "../types";
import * as input from "@/lib/course";
import { courseAction } from "@/server/course";
import { paymentRepository } from "@/server/repository";
import { requireAdmin } from "@/server/auth";
async function _decide(request: Types.RefundDecisionInput): Promise<string> {
  return courseAction(async () => {
    const actor = await requireAdmin();
    return paymentRepository.decideRefundRequest(
      input.refundDecisionSchema.parse(request),
      actor.id,
    );
  });
}
export const decide = createAction(_decide);
