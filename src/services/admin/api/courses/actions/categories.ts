"use server";
import { createAction } from "@/lib/utils";
import type * as Types from "../types";
import { courseAction } from "@/server/course";
import { catalogRepository } from "@/server/repository";
import { requireAdmin } from "@/server/auth";
async function _categories(): Promise<Types.CategoryView[]> {
  return courseAction(async () => {
    await requireAdmin();
    return (await catalogRepository.findCategories()).map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
    }));
  });
}
export const categories = createAction(_categories);
