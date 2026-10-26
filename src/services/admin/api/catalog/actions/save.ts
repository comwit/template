"use server";
import { createAction } from "@/lib/utils";
import type * as Types from "../types";
import * as input from "@/lib/commerce";
import { commerceAction } from "@/server/commerce";
import { catalogRepository } from "@/server/repository";
import { requireAdmin } from "@/server/auth";
async function _save(request: Types.ProductInput): Promise<string> {
  return commerceAction(async () => {
    const actor = await requireAdmin();
    return catalogRepository.save(input.productSchema.parse(request), actor.id);
  });
}
export const save = createAction(_save);
