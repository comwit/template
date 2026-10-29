"use server";
import { createAction } from "@/lib/utils";
import * as input from "@/lib/course";
import { courseAction } from "@/server/course";
import { catalogRepository } from "@/server/repository";
import { requireAdmin } from "@/server/auth";
async function _removeInstructor(id: string): Promise<void> {
  return courseAction(async () => {
    const actor = await requireAdmin();
    await catalogRepository.removeInstructor(input.entityId.parse(id), actor.id);
  });
}
export const removeInstructor = createAction(_removeInstructor);
