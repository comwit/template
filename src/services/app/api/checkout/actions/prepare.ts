"use server";
import { createAction } from "@/lib/utils";
import type * as Types from "../types";
import * as input from "@/lib/course";
import { courseAction } from "@/server/course";
import { orderRepository } from "@/server/repository";
import { requireCustomer } from "@/server/auth";
import { getPaymentConfiguration } from "@/server/payments";
async function _prepare(request: Types.CheckoutInput): Promise<Types.CheckoutView> {
  return courseAction(async () => {
    const actor = await requireCustomer();
    await orderRepository.expirePending();
    const order = await orderRepository.create(
      input.checkoutSchema.parse(request),
      actor,
    );
    if (order.total === 0)
      return {
        id: order.id,
        orderId: order.number,
        orderName: order.courseTitle,
        amount: 0,
        free: true,
        courseId: order.courseId,
        clientKey: "",
        customerKey: actor.id,
        customerEmail: actor.email,
        successUrl: "",
        failUrl: "",
        mode: "test",
      };
    const settings = getPaymentConfiguration();
    return {
      id: order.id,
      orderId: order.number,
      orderName: order.courseTitle,
      amount: order.total,
      free: false,
      courseId: order.courseId,
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
