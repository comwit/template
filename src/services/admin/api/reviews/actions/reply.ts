"use server";
import { createAction } from "@/lib/utils";
import type * as Types from "../types";
import * as input from "@/lib/course";
import { courseAction } from "@/server/course";
import { communityRepository } from "@/server/repository";
import { requireAdmin } from "@/server/auth";
async function _reply(request: Types.ReviewReplyInput): Promise<void> {
  return courseAction(async () => {
    const actor = await requireAdmin();
    await communityRepository.replyReview(
      input.reviewReplySchema.parse(request),
      actor.id,
    );
  });
}
export const reply = createAction(_reply);
