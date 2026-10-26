import type { CheckoutAPI } from "@/services/app/api/checkout";
import { formatMoney } from "@/lib/commerce";
import { order as exampleOrder } from "../../fixtures";
import { mockApi } from "../runtime";
import { cartView } from "../commerce";
export const checkout = {
  prepare: mockApi<CheckoutAPI["prepare"]>((db, input) => {
    const cart = cartView(
      db,
      Object.fromEntries(
        input.items.map((item) => [item.skuId, item.quantity]),
      ),
    );
    const id = crypto.randomUUID();
    const orderId = "story-" + id;
    const order = structuredClone(exampleOrder);
    Object.assign(order, {
      id,
      number: orderId,
      displayNumber: orderId,
      address: input.address,
      total: cart.total,
      totalLabel: cart.totalLabel,
      subtotalLabel: formatMoney(cart.subtotal),
      shippingFee: cart.shippingFee,
      shippingLabel: formatMoney(cart.shippingFee),
      status: "pending",
      statusLabel: "결제 대기",
      paymentStatus: "pending",
      paymentLabel: "결제 대기",
      payment: null,
      history: [],
      items: cart.items.map((item) => ({
        id: crypto.randomUUID(),
        skuId: item.skuId,
        name: item.name,
        skuCode: "STORY-SKU",
        optionLabel: item.optionLabel,
        unitPrice: item.unitPrice,
        priceLabel: item.priceLabel,
        quantity: item.quantity,
        refundedQuantity: 0,
        refundableQuantity: item.quantity,
        image: null,
      })),
    });
    db.orders.unshift(order);
    return {
      id,
      orderId,
      orderName: cart.items[0]?.name ?? "예시 주문",
      amount: cart.total,
      clientKey: "storybook-only",
      customerKey: db.appUser?.id ?? "story-guest",
      customerEmail: db.appUser?.email ?? "guest@example.test",
      successUrl: "https://example.test/storybook/success",
      failUrl: "https://example.test/storybook/fail",
      mode: "test",
    };
  }),
  confirm: mockApi<CheckoutAPI["confirm"]>((db, input) => {
    const order = db.orders.find((item) => item.number === input.orderId);
    if (!order || order.total !== input.amount)
      throw new Error("예시 주문을 확인해주세요.");
    Object.assign(order, {
      status: "confirmed",
      statusLabel: "주문 확인",
      paymentStatus: "paid",
      paymentLabel: "결제 완료",
    });
    return order;
  }),
} satisfies CheckoutAPI;
