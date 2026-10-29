"use server";
import { createAction } from "@/lib/utils";
import type * as Types from "../types";
import * as input from "@/lib/course";
import { courseAction } from "@/server/course";
import { communityRepository } from "@/server/repository";
import { requireCustomer } from "@/server/auth";
async function _writeReview(request: Types.ReviewInput): Promise<string> {
  return courseAction(async () => {
    const actor = await requireCustomer();
    return communityRepository.writeReview(
      input.reviewSchema.parse(request),
      actor.id,
    );
  });
}
export const writeReview = createAction(_writeReview);
