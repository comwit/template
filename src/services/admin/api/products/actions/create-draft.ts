"use server";
import { createAction } from "@/lib/utils";
import { courseAction } from "@/server/course";
import { productRepository } from "@/server/repository";
import { requireAdmin } from "@/server/auth";
async function _createDraft(): Promise<string> {
  return courseAction(async () => {
    const actor = await requireAdmin();
    return productRepository.createDraft(actor.id);
  });
}
export const createDraft = createAction(_createDraft);
