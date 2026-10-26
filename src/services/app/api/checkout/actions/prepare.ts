"use server";
import { createAction } from "@/lib/utils";
import type * as Types from "../types";
import * as input from "@/lib/commerce";
import { commerceAction } from "@/server/commerce";
import { orderRepository } from "@/server/repository";
import { getPaymentConfiguration } from "@/server/payments";
import { requireCustomer } from "@/server/auth";
async function _prepare(
  request: Types.CheckoutInput,
): Promise<Types.CheckoutView> {
  return commerceAction(async () => {
    const actor = await requireCustomer();
    const settings = getPaymentConfiguration();
    await orderRepository.expirePending();
    const order = await orderRepository.create(
      input.checkoutSchema.parse(request),
      actor,
    );
    const detail = await orderRepository.findById(order.id, actor.id);
    return {
      id: order.id,
      orderId: order.number,
      orderName:
        detail.items.length === 1
          ? detail.items[0].productName
          : `${detail.items[0].productName} 외 ${detail.items.length - 1}건`,
      amount: order.total,
      clientKey: settings.clientKey,
      customerKey: actor.id,
      customerEmail: actor.email,
      successUrl: `${settings.appUrl}/api/payments/success`,
      failUrl: `${settings.appUrl}/api/payments/fail`,
      mode: settings.mode,
    };
  });
}
export const prepare = createAction(_prepare);
