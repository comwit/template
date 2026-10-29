"use server";
import { createAction } from "@/lib/utils";
import * as input from "@/lib/course";
import { courseAction } from "@/server/course";
import { orderRepository } from "@/server/repository";
import { requireCustomer } from "@/server/auth";
async function _cancel(id: string): Promise<void> {
  return courseAction(async () => {
    const actor = await requireCustomer();
    await orderRepository.cancelUnpaid(input.entityId.parse(id), actor.id, actor.id);
  });
}
export const cancel = createAction(_cancel);
