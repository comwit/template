"use server";
import { createAction } from "@/lib/utils";
import type * as Types from "../types";
import * as input from "@/lib/course";
import { courseAction } from "@/server/course";
import { communityRepository } from "@/server/repository";
import { requireAdmin } from "@/server/auth";
async function _setVisibility(request: Types.ReviewVisibilityInput): Promise<void> {
  return courseAction(async () => {
    const actor = await requireAdmin();
    await communityRepository.setReviewVisibility(
      input.reviewVisibilitySchema.parse(request),
      actor.id,
    );
  });
}
export const setVisibility = createAction(_setVisibility);
