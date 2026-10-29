"use server";
import { createAction } from "@/lib/utils";
import type * as Types from "../types";
import * as input from "@/lib/course";
import { courseAction } from "@/server/course";
import { productRepository } from "@/server/repository";
import { requireAdmin } from "@/server/auth";
async function _prepareFile(request: Types.ProductFileInput): Promise<Types.FileUploadTicket> {
  return courseAction(async () => {
    const actor = await requireAdmin();
    return productRepository.prepareFileUpload(
      actor.id,
      input.productFileSchema.parse(request),
    );
  });
}
export const prepareFile = createAction(_prepareFile);
