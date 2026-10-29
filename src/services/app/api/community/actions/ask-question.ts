"use server";
import { createAction } from "@/lib/utils";
import type * as Types from "../types";
import * as input from "@/lib/course";
import { courseAction } from "@/server/course";
import { communityRepository } from "@/server/repository";
import { requireCustomer } from "@/server/auth";
async function _askQuestion(request: Types.QuestionInput): Promise<string> {
  return courseAction(async () => {
    const actor = await requireCustomer();
    return communityRepository.askQuestion(
      input.questionSchema.parse(request),
      actor.id,
    );
  });
}
export const askQuestion = createAction(_askQuestion);
