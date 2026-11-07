"use server";
import { createAction } from "@/lib/utils";
import type * as Types from "../types";
import * as input from "@/lib/course";
import { courseAction, presentProductDetail } from "@/server/course";
import {
  CourseError,
  productRepository,
  purchaseRepository,
} from "@/server/repository";
import { getAppServerSession } from "@/server/auth/app";
// find 와 같은 규칙: 잘못된 id·없는·비공개 상품은 null (상세 query 의 "없는 상품").
async function _product(id: string): Promise<Types.ProductView | null> {
  return courseAction(async () => {
    if (!input.entityId.safeParse(id).success) return null;
    let product: Awaited<ReturnType<typeof productRepository.findById>>;
    try {
      product = await productRepository.findById(id, true);
    } catch (error) {
      if (error instanceof CourseError && error.code === "NOT_FOUND") return null;
      throw error;
    }
    const session = await getAppServerSession();
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
