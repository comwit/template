"use server";
import { createAction } from "@/lib/utils";
import type * as Types from "../types";
import * as input from "@/lib/course";
import { courseAction, presentCourseDetail } from "@/server/course";
import { catalogRepository } from "@/server/repository";
import { requireAdmin } from "@/server/auth";
async function _find(id: string): Promise<Types.CourseView> {
  return courseAction(async () => {
    await requireAdmin();
    return presentCourseDetail(
      await catalogRepository.findById(input.entityId.parse(id)),
      "full",
    );
  });
}
export const find = createAction(_find);
