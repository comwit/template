"use server";
import { createAction } from "@/lib/utils";
import type * as Types from "../types";
import * as input from "@/lib/course";
import { courseAction, presentProductDetail } from "@/server/course";
import { productRepository } from "@/server/repository";
import { requireAdmin } from "@/server/auth";
async function _find(id: string): Promise<Types.ProductView> {
  return courseAction(async () => {
    await requireAdmin();
    return presentProductDetail(
      await productRepository.findById(input.entityId.parse(id)),
    );
  });
}
export const find = createAction(_find);
