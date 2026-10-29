"use server";
import { createAction } from "@/lib/utils";
import * as input from "@/lib/course";
import { courseAction } from "@/server/course";
import { contentRepository } from "@/server/repository";
import { requireAdmin } from "@/server/auth";
async function _remove(id: string): Promise<void> {
  return courseAction(async () => {
    const actor = await requireAdmin();
    await contentRepository.removeBanner(input.entityId.parse(id), actor.id);
  });
}
export const remove = createAction(_remove);
