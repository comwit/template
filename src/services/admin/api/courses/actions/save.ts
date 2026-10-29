"use server";
import { createAction } from "@/lib/utils";
import type * as Types from "../types";
import * as input from "@/lib/course";
import { courseAction } from "@/server/course";
import { catalogRepository } from "@/server/repository";
import { requireAdmin } from "@/server/auth";
async function _save(request: Types.CourseInput): Promise<string> {
  return courseAction(async () => {
    const actor = await requireAdmin();
    return catalogRepository.save(input.courseSchema.parse(request), actor.id);
  });
}
export const save = createAction(_save);
