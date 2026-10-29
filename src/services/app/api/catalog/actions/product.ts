"use server";
import { createAction } from "@/lib/utils";
import type * as Types from "../types";
import * as input from "@/lib/course";
import { courseAction, presentProductDetail } from "@/server/course";
import { productRepository, purchaseRepository } from "@/server/repository";
import { getAppServerSession } from "@/server/auth/app";
async function _product(id: string): Promise<Types.ProductView> {
  return courseAction(async () => {
    const session = await getAppServerSession();
    const product = await productRepository.findById(input.entityId.parse(id), true);
    const purchase = session?.user
      ? await purchaseRepository.findActive(product.id, session.user.id)
      : null;
    return presentProductDetail(
      product,
      purchase ? { id: purchase.id, downloadCount: purchase.downloadCount } : null,
    );
  });
}
export const product = createAction(_product);
