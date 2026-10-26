"use server";
import { createAction } from "@/lib/utils";
import type * as Types from "../types";
import * as input from "@/lib/commerce";
import { commerceMutation } from "@/server/commerce";
import { orderRepository } from "@/server/repository";
import { requireAdmin } from "@/server/auth";
async function _deliver(id: string): Promise<void> {
  return commerceMutation(async () => {
    const actor = await requireAdmin();
    await orderRepository.deliver(input.entityId.parse(id), actor.id);
  });
}
export const deliver = createAction(_deliver);
