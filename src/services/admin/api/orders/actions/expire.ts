"use server";
import { createAction } from "@/lib/utils";
import { courseAction } from "@/server/course";
import { orderRepository } from "@/server/repository";
import { requireAdmin } from "@/server/auth";
async function _expire(): Promise<number> {
  return courseAction(async () => {
    await requireAdmin();
    return orderRepository.expirePending();
  });
}
export const expire = createAction(_expire);
