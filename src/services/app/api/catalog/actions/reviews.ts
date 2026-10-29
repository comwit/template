"use server";
import { createAction } from "@/lib/utils";
import type * as Types from "../types";
import type { PageRequest, Pageable } from "@/server/repository/types";
import * as input from "@/lib/course";
import { courseAction, presentReview } from "@/server/course";
import { communityRepository } from "@/server/repository";
async function _reviews(courseId: string, pageable: PageRequest): Promise<Pageable<Types.ReviewView>> {
  return courseAction(async () => {
    const result = await communityRepository.findReviews(
      { search: "", status: "" },
      input.pageSchema.parse(pageable),
      { courseId: input.entityId.parse(courseId), publicOnly: true },
    );
    return { ...result, items: result.items.map(presentReview) };
  });
}
export const reviews = createAction(_reviews);
