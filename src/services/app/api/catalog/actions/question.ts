"use server";
import { createAction } from "@/lib/utils";
import type * as Types from "../types";
import * as input from "@/lib/course";
import { courseAction, presentQuestion } from "@/server/course";
import { communityRepository } from "@/server/repository";
async function _question(id: string): Promise<Types.QuestionView> {
  return courseAction(async () => {
    return presentQuestion(
      await communityRepository.findQuestion(input.entityId.parse(id)),
    );
  });
}
export const question = createAction(_question);
