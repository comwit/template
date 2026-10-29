"use server";
import { createAction } from "@/lib/utils";
import type * as Types from "../types";
import * as input from "@/lib/course";
import { courseAction } from "@/server/course";
import { communityRepository } from "@/server/repository";
import { requireAdmin } from "@/server/auth";
async function _setStatus(request: Types.QuestionStatusInput): Promise<void> {
  return courseAction(async () => {
    const actor = await requireAdmin();
    await communityRepository.setQuestionStatus(
      input.questionStatusSchema.parse(request),
      actor.id,
    );
  });
}
export const setStatus = createAction(_setStatus);
