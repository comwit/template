"use server";
import { createAction } from "@/lib/utils";
import type * as Types from "../types";
import * as input from "@/lib/course";
import { courseAction, presentQuestion } from "@/server/course";
import { communityRepository } from "@/server/repository";
import { requireAdmin } from "@/server/auth";
async function _find(id: string): Promise<Types.QuestionView> {
  return courseAction(async () => {
    await requireAdmin();
    return presentQuestion(
      await communityRepository.findQuestion(input.entityId.parse(id)),
    );
  });
}
export const find = createAction(_find);
