"use server";
import { createAction } from "@/lib/utils";
import { courseAction } from "@/server/course";
import { paymentRepository } from "@/server/repository";
import { requireAdmin } from "@/server/auth";
async function _reconcilePending(): Promise<{ succeeded: number; failed: number }> {
  return courseAction(async () => {
    await requireAdmin();
    return paymentRepository.reconcilePending();
  });
}
export const reconcilePending = createAction(_reconcilePending);
