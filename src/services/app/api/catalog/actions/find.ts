"use server";
import { createAction } from "@/lib/utils";
import type * as Types from "../types";
import * as input from "@/lib/commerce";
import { commerceAction, presentProduct } from "@/server/commerce";
import {
  CommerceError,
  catalogRepository,
  orderRepository,
} from "@/server/repository";
// 잘못된 id·없는·비공개 상품은 null 이다(오류가 아니다). 상세 query 가 null 을 not-found 로 그리고,
// 목록 seed 위에서 재조회가 null 로 올라오면 삭제된 상품으로 바뀐다. 다른 오류는 그대로 던진다.
async function _find(id: string): Promise<Types.ProductView | null> {
  if (!input.entityId.safeParse(id).success) return null;
  return commerceAction(async () => {
    await orderRepository.expirePending();
    try {
      return presentProduct(await catalogRepository.findById(id, true));
    } catch (error) {
      if (error instanceof CommerceError && error.code === "NOT_FOUND")
        return null;
      throw error;
    }
  });
}
export const find = createAction(_find);
