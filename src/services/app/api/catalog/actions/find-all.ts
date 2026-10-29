"use server";
import { createAction } from "@/lib/utils";
import type * as Types from "../types";
import type { PageRequest, Pageable } from "@/server/repository/types";
import * as input from "@/lib/course";
import { courseAction, presentCourse } from "@/server/course";
import { catalogRepository } from "@/server/repository";
async function _findAll(filter: Types.CourseFilter, pageable: PageRequest): Promise<Pageable<Types.CourseSummary>> {
  return courseAction(async () => {
    const result = await catalogRepository.findPublic(
      input.courseFilterSchema.parse(filter),
      input.pageSchema.parse(pageable),
    );
    return { ...result, items: result.items.map(presentCourse) };
  });
}
export const findAll = createAction(_findAll);
