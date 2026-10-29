"use server";
import { createAction } from "@/lib/utils";
import type * as Types from "../types";
import * as input from "@/lib/course";
import { courseAction } from "@/server/course";
import { communityRepository } from "@/server/repository";
import { requireCustomer } from "@/server/auth";
async function _comment(request: Types.CommentInput): Promise<string> {
  return courseAction(async () => {
    const actor = await requireCustomer();
    return communityRepository.addComment(input.commentSchema.parse(request), {
      id: actor.id,
      name: actor.name ?? "수강생",
      type: "user",
    });
  });
}
export const comment = createAction(_comment);
