import type { AdminOrdersAPI } from "@/services/admin/api/orders";
import { formatMoney } from "@/lib/course";
import { findItem, list, mockApi } from "../runtime";
import { nowLabel, statusLabel } from "../labels";
import type { MockData } from "../data";

/** 전액 환불을 주문·결제·수강에 반영한다. 환불 신청 승인과 관리자 환불이 같이 쓴다. */
export function applyRefund(db: MockData, orderId: string, reason: string) {
  const order = findItem(db.orders, orderId);
  if (order.status !== "confirmed")
    throw new Error("결제 완료된 주문만 환불할 수 있습니다.");
  const refundId = crypto.randomUUID();
  order.refunds.push({
    id: refundId,
    status: "succeeded",
    statusLabel: statusLabel("succeeded"),
    amountLabel: formatMoney(order.total),
    reason,
    createdLabel: nowLabel(),
  });
  Object.assign(order, {
    status: "refunded",
    statusLabel: statusLabel("refunded"),
    paymentStatus: "refunded",
    paymentLabel: statusLabel("refunded"),
    canRequestRefund: false,
  });
  order.history.push({
    id: crypto.randomUUID(),
    action: "환불 완료",
    createdLabel: nowLabel(),
  });
  const payment = db.payments.find((item) => item.orderId === order.id);
  if (payment) {
    payment.refundedAmount = payment.amount;
    payment.refundedLabel = formatMoney(payment.amount);
    payment.refundableAmount = 0;
    payment.status = "cancelled";
    payment.statusLabel = statusLabel("refunded");
    const { customerEmail: _email, courseTitle: _title, ...view } = payment;
    order.payment = structuredClone(view);
  }
  const enrollment = db.enrollments.find((item) => item.orderId === order.id);
  if (enrollment)
    Object.assign(enrollment, {
      status: "revoked",
      statusLabel: statusLabel("revoked"),
    });
  return refundId;
}

export const adminOrders = {
  findAll: mockApi<AdminOrdersAPI["findAll"]>((db, filter, page) =>
    list(db.orders, filter, page),
  ),
  find: mockApi<AdminOrdersAPI["find"]>((db, id) => findItem(db.orders, id)),
  cancel: mockApi<AdminOrdersAPI["cancel"]>((db, id) => {
    const order = findItem(db.orders, id);
    if (order.status !== "pending")
      throw new Error("결제 대기 주문만 취소할 수 있습니다.");
    Object.assign(order, {
      status: "cancelled",
      statusLabel: statusLabel("cancelled"),
      canRequestRefund: false,
    });
    order.history.push({
      id: crypto.randomUUID(),
      action: "주문 취소",
      createdLabel: nowLabel(),
    });
  }),
  refund: mockApi<AdminOrdersAPI["refund"]>((db, input) =>
    applyRefund(db, input.orderId, input.reason),
  ),
  expire: mockApi<AdminOrdersAPI["expire"]>((db) => {
    const pending = db.orders.filter((order) => order.status === "pending");
    pending.forEach((order) =>
      Object.assign(order, {
        status: "expired",
        statusLabel: statusLabel("expired"),
      }),
    );
    return pending.length;
  }),
} satisfies AdminOrdersAPI;
