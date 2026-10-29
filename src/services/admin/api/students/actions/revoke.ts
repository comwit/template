"use server";
import { createAction } from "@/lib/utils";
import type * as Types from "../types";
import * as input from "@/lib/course";
import { courseAction } from "@/server/course";
import { enrollmentRepository } from "@/server/repository";
import { requireAdmin } from "@/server/auth";
async function _revoke(request: Types.RevokeInput): Promise<void> {
  return courseAction(async () => {
    const actor = await requireAdmin();
    await enrollmentRepository.revoke(input.revokeSchema.parse(request), actor.id);
  });
}
export const revoke = createAction(_revoke);
