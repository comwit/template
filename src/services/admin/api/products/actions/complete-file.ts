"use server";
import { createAction } from "@/lib/utils";
import type * as Types from "../types";
import * as input from "@/lib/course";
import { courseAction, presentProductFile } from "@/server/course";
import { productRepository } from "@/server/repository";
import { requireAdmin } from "@/server/auth";
async function _completeFile(fileId: string): Promise<Types.ProductFileView> {
  return courseAction(async () => {
    const actor = await requireAdmin();
    return presentProductFile(
      await productRepository.completeFileUpload(actor.id, input.entityId.parse(fileId)),
    );
  });
}
export const completeFile = createAction(_completeFile);
