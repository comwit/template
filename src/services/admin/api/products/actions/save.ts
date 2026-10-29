"use server";
import { createAction } from "@/lib/utils";
import type * as Types from "../types";
import * as input from "@/lib/course";
import { courseAction } from "@/server/course";
import { productRepository } from "@/server/repository";
import { requireAdmin } from "@/server/auth";
async function _save(request: Types.ProductInput): Promise<string> {
  return courseAction(async () => {
    const actor = await requireAdmin();
    return productRepository.save(input.productSchema.parse(request), actor.id);
  });
}
export const save = createAction(_save);
