import type { OrdersAPI } from "@/services/app/api/orders";
import { findItem, mockApi, paginate } from "../runtime";
import { nowLabel, statusLabel } from "../labels";
import type { MockData } from "../data";

const mine = (db: MockData) =>
  db.orders.filter((order) => order.customerId === db.appUser?.id);

export const orders = {
  findAll: mockApi<OrdersAPI["findAll"]>((db, page) =>
    paginate(
      mine(db).map(({ history: _history, ...order }) => ({
        ...order,
        history: [],
      })),
      page,
    ),
  ),
  find: mockApi<OrdersAPI["find"]>((db, id) => ({
    ...findItem(mine(db), id),
    history: [],
  })),
  cancel: mockApi<OrdersAPI["cancel"]>((db, id) => {
    const order = findItem(mine(db), id);
    if (order.status !== "pending")
      throw new Error("결제 대기 주문만 취소할 수 있습니다.");
    Object.assign(order, {
      status: "cancelled",
      statusLabel: statusLabel("cancelled"),
      canRequestRefund: false,
    });
  }),
  requestRefund: mockApi<OrdersAPI["requestRefund"]>((db, input) => {
    const order = findItem(mine(db), input.orderId);
    if (!order.canRequestRefund)
      throw new Error("환불을 신청할 수 없는 주문입니다.");
    const id = crypto.randomUUID();
    const request = {
      id,
      orderId: order.id,
      displayNumber: order.displayNumber,
      customerEmail: order.customerEmail,
      itemTitle: order.itemTitle,
      amount: order.total,
      amountLabel: order.totalLabel,
      reason: input.reason,
      status: "pending" as const,
      statusLabel: statusLabel("pending"),
      note: "",
      createdLabel: nowLabel(),
      decidedLabel: null,
    };
    db.refundRequests.unshift(request);
    order.refundRequest = structuredClone(request);
    order.canRequestRefund = false;
    db.dashboard.pendingRefunds += 1;
    return id;
  }),
} satisfies OrdersAPI;
