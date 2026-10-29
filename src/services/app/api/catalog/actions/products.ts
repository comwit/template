"use server";
import { createAction } from "@/lib/utils";
import type * as Types from "../types";
import type { PageRequest, Pageable } from "@/server/repository/types";
import * as input from "@/lib/course";
import { courseAction, presentProduct } from "@/server/course";
import { productRepository } from "@/server/repository";
async function _products(filter: Types.ProductFilter, pageable: PageRequest): Promise<Pageable<Types.ProductSummary>> {
  return courseAction(async () => {
    const result = await productRepository.findPublic(
      input.productFilterSchema.parse(filter),
      input.pageSchema.parse(pageable),
    );
    return { ...result, items: result.items.map(presentProduct) };
  });
}
export const products = createAction(_products);
