"use server";
import { createAction } from "@/lib/utils";
import * as input from "@/lib/course";
import { courseAction } from "@/server/course";
import { productRepository } from "@/server/repository";
import { requireAdmin } from "@/server/auth";
async function _removeFile(fileId: string): Promise<void> {
  return courseAction(async () => {
    const actor = await requireAdmin();
    await productRepository.removeFile(actor.id, input.entityId.parse(fileId), actor.id);
  });
}
export const removeFile = createAction(_removeFile);
