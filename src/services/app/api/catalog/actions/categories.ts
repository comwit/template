"use server";
import { createAction } from "@/lib/utils";
import type * as Types from "../types";
import { commerceAction } from "@/server/commerce";
import { catalogRepository } from "@/server/repository";
async function _categories(): Promise<Types.CategoryView[]> {
  return commerceAction(async () => {
    return catalogRepository.findCategories();
  });
}
export const categories = createAction(_categories);
