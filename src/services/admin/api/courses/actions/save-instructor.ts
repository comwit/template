"use server";
import { createAction } from "@/lib/utils";
import type * as Types from "../types";
import * as input from "@/lib/course";
import { courseAction } from "@/server/course";
import { catalogRepository } from "@/server/repository";
import { requireAdmin } from "@/server/auth";
async function _saveInstructor(request: Types.InstructorInput): Promise<string> {
  return courseAction(async () => {
    const actor = await requireAdmin();
    return catalogRepository.saveInstructor(
      input.instructorSchema.parse(request),
      actor.id,
    );
  });
}
export const saveInstructor = createAction(_saveInstructor);
