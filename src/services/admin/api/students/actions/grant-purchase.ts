"use server";
import { createAction } from "@/lib/utils";
import type * as Types from "../types";
import * as input from "@/lib/course";
import { courseAction } from "@/server/course";
import { purchaseRepository } from "@/server/repository";
import { requireAdmin } from "@/server/auth";
async function _grantPurchase(request: Types.GrantPurchaseInput): Promise<string> {
  return courseAction(async () => {
    const actor = await requireAdmin();
    return purchaseRepository.grant(input.grantPurchaseSchema.parse(request), actor.id);
  });
}
export const grantPurchase = createAction(_grantPurchase);
