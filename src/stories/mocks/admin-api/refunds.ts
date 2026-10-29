import type { AdminRefundsAPI } from "@/services/admin/api/refunds";
import { findItem, list, mockApi } from "../runtime";
import { nowLabel, statusLabel } from "../labels";
import { applyRefund } from "./orders";
export const adminRefunds = {
  findAll: mockApi<AdminRefundsAPI["findAll"]>((db, filter, page) =>
    list(db.refundRequests, filter, page),
  ),
  decide: mockApi<AdminRefundsAPI["decide"]>((db, input) => {
    const request = findItem(db.refundRequests, input.requestId);
    if (request.status !== "pending")
      throw new Error("이미 처리된 환불 신청입니다.");
    const status = input.approve ? "approved" : "rejected";
    Object.assign(request, {
      status,
      statusLabel: statusLabel(status),
      note: input.note,
      decidedLabel: nowLabel(),
    });
    const order = db.orders.find((item) => item.id === request.orderId);
    if (order) {
      order.refundRequest = structuredClone(request);
      if (!input.approve)
        order.history.push({
          id: crypto.randomUUID(),
          action: "환불 신청 거절",
          createdLabel: nowLabel(),
        });
    }
    if (input.approve) applyRefund(db, request.orderId, request.reason);
    return request.id;
  }),
} satisfies AdminRefundsAPI;
