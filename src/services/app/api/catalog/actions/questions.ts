"use server";
import { createAction } from "@/lib/utils";
import type * as Types from "../types";
import type { PageRequest, Pageable } from "@/server/repository/types";
import * as input from "@/lib/course";
import { courseAction, presentQuestion } from "@/server/course";
import { communityRepository } from "@/server/repository";
async function _questions(courseId: string, lessonId: string | null, pageable: PageRequest): Promise<Pageable<Types.QuestionView>> {
  return courseAction(async () => {
    const result = await communityRepository.findQuestions(
      { search: "", status: "" },
      input.pageSchema.parse(pageable),
      {
        courseId: input.entityId.parse(courseId),
        lessonId: input.entityId.nullable().parse(lessonId),
      },
    );
    return { ...result, items: result.items.map(presentQuestion) };
  });
}
export const questions = createAction(_questions);
