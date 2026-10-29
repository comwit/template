"use server";
import { createAction } from "@/lib/utils";
import type * as Types from "../types";
import { courseAction, presentInstructor } from "@/server/course";
import { catalogRepository } from "@/server/repository";
import { requireAdmin } from "@/server/auth";
async function _instructors(): Promise<Types.InstructorView[]> {
  return courseAction(async () => {
    await requireAdmin();
    return (await catalogRepository.findInstructors()).map(presentInstructor);
  });
}
export const instructors = createAction(_instructors);
