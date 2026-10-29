"use server";
import { createAction } from "@/lib/utils";
import type * as Types from "../types";
import * as input from "@/lib/course";
import { courseAction, presentOrderDetail } from "@/server/course";
import { orderRepository } from "@/server/repository";
import { requireCustomer } from "@/server/auth";
async function _find(id: string): Promise<Types.OrderView> {
  return courseAction(async () => {
    const actor = await requireCustomer();
    return presentOrderDetail(
      await orderRepository.findById(input.entityId.parse(id), actor.id),
    );
  });
}
export const find = createAction(_find);
