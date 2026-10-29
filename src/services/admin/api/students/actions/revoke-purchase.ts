"use server";
import { createAction } from "@/lib/utils";
import type * as Types from "../types";
import * as input from "@/lib/course";
import { courseAction } from "@/server/course";
import { purchaseRepository } from "@/server/repository";
import { requireAdmin } from "@/server/auth";
async function _revokePurchase(request: Types.RevokePurchaseInput): Promise<void> {
  return courseAction(async () => {
    const actor = await requireAdmin();
    await purchaseRepository.revoke(input.revokePurchaseSchema.parse(request), actor.id);
  });
}
export const revokePurchase = createAction(_revokePurchase);
