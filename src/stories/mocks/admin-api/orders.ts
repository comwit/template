import { kstCompactDateTime } from "@/lib/kst";
import type { AdminOrdersAPI } from "@/services/admin/api/orders";
import { formatMoney } from "@/lib/commerce";
import { findItem, list, mockApi } from "../runtime";
export const adminOrders = {
  findAll: mockApi<AdminOrdersAPI["findAll"]>((db, filter, page) =>
    list(db.orders, filter, page),
  ),
  find: mockApi<AdminOrdersAPI["find"]>((db, id) => findItem(db.orders, id)),
  cancel: mockApi<AdminOrdersAPI["cancel"]>((db, id) => {
    Object.assign(findItem(db.orders, id), {
      status: "cancelled",
      statusLabel: "취소",
    });
  }),
  ship: mockApi<AdminOrdersAPI["ship"]>((db, input) => {
    Object.assign(findItem(db.orders, input.orderId), {
      fulfillmentStatus: "shipped",
      fulfillmentLabel: "배송 중",
      shipment: {
        carrier: input.carrier,
        trackingNumber: input.trackingNumber,
        statusLabel: "배송 중",
      },
    });
  }),
  deliver: mockApi<AdminOrdersAPI["deliver"]>((db, id) => {
    const order = findItem(db.orders, id);
    Object.assign(order, {
      fulfillmentStatus: "delivered",
      fulfillmentLabel: "배송 완료",
    });
    if (order.shipment) order.shipment.statusLabel = "배송 완료";
  }),
  refund: mockApi<AdminOrdersAPI["refund"]>((db, input) => {
    const order = findItem(db.orders, input.orderId);
    let amount = input.refundShipping ? order.shippingFee : 0;
    for (const entry of input.items) {
      const item = findItem(order.items, entry.orderItemId);
      amount += entry.quantity * item.unitPrice;
      item.refundedQuantity += entry.quantity;
      item.refundableQuantity -= entry.quantity;
    }
    order.refunds.push({
      id: crypto.randomUUID(),
      status: "done",
      statusLabel: "환불 완료",
      amountLabel: formatMoney(amount),
      reason: input.reason,
      restock: input.restock,
      createdLabel: kstCompactDateTime(new Date("2026-10-14T10:00:00+09:00")),
    });
    const payment = db.payments.find((item) => item.orderId === order.id);
    if (payment) {
      payment.refundedAmount += amount;
      payment.refundedLabel = formatMoney(payment.refundedAmount);
      payment.refundableAmount -= amount;
      payment.status = payment.refundableAmount
        ? "partial_cancelled"
        : "cancelled";
      payment.statusLabel = payment.refundableAmount
        ? "부분 환불"
        : "환불 완료";
      order.payment = structuredClone(payment);
      order.paymentStatus = payment.refundableAmount
        ? "partially_refunded"
        : "refunded";
      order.paymentLabel = payment.statusLabel;
    }
    return "done";
  }),
  expire: mockApi<AdminOrdersAPI["expire"]>((db) => {
    const pending = db.orders.filter((order) => order.status === "pending");
    pending.forEach((order) =>
      Object.assign(order, { status: "cancelled", statusLabel: "취소" }),
    );
    return pending.length;
  }),
} satisfies AdminOrdersAPI;
