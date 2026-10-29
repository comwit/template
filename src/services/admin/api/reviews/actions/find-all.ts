"use server";
import { createAction } from "@/lib/utils";
import type * as Types from "../types";
import type { PageRequest, Pageable } from "@/server/repository/types";
import * as input from "@/lib/course";
import { courseAction, presentReview } from "@/server/course";
import { communityRepository } from "@/server/repository";
import { requireAdmin } from "@/server/auth";
async function _findAll(filter: Types.ListFilter, pageable: PageRequest): Promise<Pageable<Types.ReviewView>> {
  return courseAction(async () => {
    await requireAdmin();
    const result = await communityRepository.findReviews(
      input.listFilterSchema.parse(filter),
      input.pageSchema.parse(pageable),
    );
    return { ...result, items: result.items.map(presentReview) };
  });
}
export const findAll = createAction(_findAll);
