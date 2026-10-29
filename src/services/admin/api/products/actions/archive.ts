"use server";
import { createAction } from "@/lib/utils";
import * as input from "@/lib/course";
import { courseAction } from "@/server/course";
import { productRepository } from "@/server/repository";
import { requireAdmin } from "@/server/auth";
async function _archive(id: string): Promise<void> {
  return courseAction(async () => {
    const actor = await requireAdmin();
    await productRepository.archive(input.entityId.parse(id), actor.id);
  });
}
export const archive = createAction(_archive);
