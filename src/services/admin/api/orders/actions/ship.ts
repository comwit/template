"use server";
import { createAction } from "@/lib/utils";
import type * as Types from "../types";
import * as input from "@/lib/commerce";
import { commerceMutation } from "@/server/commerce";
import { orderRepository } from "@/server/repository";
import { requireAdmin } from "@/server/auth";
async function _ship(request: Types.ShipmentInput): Promise<void> {
  return commerceMutation(async () => {
    const actor = await requireAdmin();
    await orderRepository.ship(input.shipmentSchema.parse(request), actor.id);
  });
}
export const ship = createAction(_ship);
