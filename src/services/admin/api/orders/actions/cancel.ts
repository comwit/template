"use server";
import { createAction } from "@/lib/utils";
import type * as Types from "../types";
import * as input from "@/lib/commerce";
import { commerceMutation } from "@/server/commerce";
import { orderRepository } from "@/server/repository";
import { requireAdmin } from "@/server/auth";
async function _cancel(id: string): Promise<void> {
  return commerceMutation(async () => {
    const actor = await requireAdmin();
    await orderRepository.cancelUnpaid(input.entityId.parse(id), actor.id);
  });
}
export const cancel = createAction(_cancel);
