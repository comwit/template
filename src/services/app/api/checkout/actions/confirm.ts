"use server";
import { createAction } from "@/lib/utils";
import type * as Types from "../types";
import * as input from "@/lib/commerce";
import { commerceMutation, presentOrderDetail } from "@/server/commerce";
import { orderRepository, paymentRepository } from "@/server/repository";
import { requireCustomer } from "@/server/auth";
async function _confirm(request: Types.ConfirmInput): Promise<Types.OrderView> {
  return commerceMutation(async () => {
    const actor = await requireCustomer();
    const id = await paymentRepository.confirm(
      input.confirmSchema.parse(request),
      actor.id,
    );
    return presentOrderDetail(await orderRepository.findById(id, actor.id));
  });
}
export const confirm = createAction(_confirm);
