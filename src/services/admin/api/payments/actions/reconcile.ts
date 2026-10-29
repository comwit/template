"use server";
import { createAction } from "@/lib/utils";
import * as input from "@/lib/course";
import { courseAction } from "@/server/course";
import { paymentRepository } from "@/server/repository";
import { requireAdmin } from "@/server/auth";
async function _reconcile(id: string): Promise<string> {
  return courseAction(async () => {
    await requireAdmin();
    return paymentRepository.reconcile(input.entityId.parse(id));
  });
}
export const reconcile = createAction(_reconcile);
