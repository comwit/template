"use server";
import { createAction } from "@/lib/utils";
import type * as Types from "../types";
import * as input from "@/lib/course";
import { courseAction } from "@/server/course";
import { communityRepository } from "@/server/repository";
import { requireAdmin } from "@/server/auth";
async function _answer(request: Types.CommentInput): Promise<string> {
  return courseAction(async () => {
    const actor = await requireAdmin();
    return communityRepository.addComment(input.commentSchema.parse(request), {
      id: actor.id,
      name: actor.name ?? "운영자",
      type: "admin",
    });
  });
}
export const answer = createAction(_answer);
