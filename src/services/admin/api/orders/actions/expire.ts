"use server";
import { createAction } from "@/lib/utils";
import type * as Types from "../types";
import { commerceAction } from "@/server/commerce";
import { orderRepository } from "@/server/repository";
import { requireAdmin } from "@/server/auth";
async function _expire(): Promise<number> {
  return commerceAction(async () => {
    await requireAdmin();
    return orderRepository.expirePending();
  });
}
export const expire = createAction(_expire);
