import "server-only";
import { atomic } from "./atomic";
import { and, count, desc, eq, inArray, isNull, like, or, sql } from "drizzle-orm";
import { getDb } from "@/server/db";
import {
  enrollments,
  orders,
  payments,
  refundRequests,
  refunds,
  webhookEvents,
} from "@/server/db/schema";
import { toss, TossError, type TossPayment } from "@/server/payments";
import type {
  ConfirmInput,
  ListFilter,
  RefundDecisionInput,
  RefundInput,
  RefundRequestInput,
} from "@/lib/course";
import {
  audit,
  CourseError,
  ensure,
  offset,
  paginate,
  platformSettings,
  stamp,
  updated,
} from "./support";
import * as coupons from "./coupons";
import { enroll, revokeByOrder } from "./enrollments";
import { uuid } from "./id";
import type { PageRequest } from "./types";

function verifyProvider(
  payment: typeof payments.$inferSelect,
  remote: TossPayment,
) {
  ensure(
    remote.paymentKey === payment.paymentKey &&
      remote.orderId === payment.providerOrderId &&
      remote.totalAmount === payment.amount,
    "결제 정보가 주문과 일치하지 않습니다.",
    "PAYMENT_MISMATCH",
  );
}
async function markUnknown(id: string, error: unknown) {
  const db = await getDb();
  const code =
    error instanceof TossError
      ? error.code
      : error instanceof CourseError
        ? error.code
        : "RECONCILIATION_REQUIRED";
  await atomic(async (tx, add) => {
    const rows = await tx
      .select()
      .from(payments)
      .where(
        and(
          eq(payments.id, id),
          inArray(payments.status, ["confirming", "unknown"]),
        ),
      );
    if (rows.length) {
      add(
        tx
          .update(payments)
          .set({ status: "unknown", lastError: code, ...updated() })
          .where(eq(payments.id, id)),
      );
      add(
        tx
          .update(orders)
          .set({ paymentStatus: "review", ...updated() })
          .where(eq(orders.id, rows[0].orderId)),
      );
    }
  });
}
/** 토스 응답을 주문·결제·수강에 반영한다. 승인 시 수강을 열고, 전액 취소 시 수강을 회수한다. */
export async function applyProvider(paymentId: string, remote: TossPayment) {
  const db = await getDb();
  return atomic(async (tx, add) => {
    const [payment] = await tx
      .select()
      .from(payments)
      .where(eq(payments.id, paymentId));
    ensure(payment, "결제를 찾을 수 없습니다.");
    verifyProvider(payment, remote);
    const [order] = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, payment.orderId));
    if (["READY", "IN_PROGRESS", "WAITING_FOR_DEPOSIT"].includes(remote.status))
      throw new CourseError(
        "결제 승인이 아직 확인되지 않았습니다.",
        "PAYMENT_PENDING",
      );
    if (["ABORTED", "EXPIRED"].includes(remote.status)) {
      ensure(!payment.approvedAt, "이미 승인된 결제의 상태 확인이 필요합니다.");
      await coupons.settle(tx, add, order.id, "released");
      add(
        tx
          .update(payments)
          .set({ status: "failed", lastError: remote.status, ...updated() })
          .where(eq(payments.id, paymentId)),
      );
      add(
        tx
          .update(orders)
          .set({ status: "cancelled", paymentStatus: "failed", ...updated() })
          .where(eq(orders.id, order.id)),
      );
      add(
        audit(tx, "payment", "payment.failed", order.id, {
          code: remote.status,
        }),
      );
      return order.id;
    }
    const refunded = remote.totalAmount - remote.balanceAmount;
    // A delayed response must never undo a later refund/webhook transition.
    if (refunded < payment.refundedAmount) return order.id;
    // 강의는 전액 환불만 지원한다. 토스에서 직접 부분 취소된 결제는 확인 필요 상태로 남긴다.
    ensure(
      remote.status !== "PARTIAL_CANCELED" &&
        (remote.status === "CANCELED"
          ? remote.balanceAmount === 0
          : refunded === 0),
      "토스에서 직접 취소된 내역이 있습니다. 결제 잔액을 확인해주세요.",
      "EXTERNAL_REFUND_REVIEW",
    );
    if (!payment.approvedAt) {
      ensure(
        order.status === "pending",
        "취소·만료된 주문의 승인 확인이 필요합니다.",
        "ORDER_REVIEW",
      );
      await coupons.settle(tx, add, order.id, "used");
      const enrollmentId = await enroll(tx, add, {
        courseId: order.courseId,
        userId: order.customerId,
        source: "order",
        orderId: order.id,
      });
      add(
        audit(tx, "payment", "payment.approved", order.id, {
          amount: payment.amount,
          enrollmentId,
        }),
      );
    }
    const fullyCancelled = remote.status === "CANCELED";
    add(
      tx
        .update(payments)
        .set({
          status: fullyCancelled ? "cancelled" : "done",
          refundedAmount: refunded,
          approvedAt:
            payment.approvedAt ??
            (remote.approvedAt ? new Date(remote.approvedAt) : new Date()),
          method: remote.method ?? null,
          receiptUrl: remote.receipt?.url ?? null,
          lastError: null,
          ...updated(),
        })
        .where(eq(payments.id, paymentId)),
    );
    add(
      tx
        .update(orders)
        .set({
          status: fullyCancelled ? "refunded" : "confirmed",
          paymentStatus: fullyCancelled ? "refunded" : "paid",
          ...updated(),
        })
        .where(eq(orders.id, order.id)),
    );
    if (fullyCancelled && refunded > payment.refundedAmount) {
      await revokeByOrder(tx, add, order.id, "결제 취소");
      add(
        audit(tx, "payment", "payment.balance_synced", order.id, {
          refundedAmount: refunded,
        }),
      );
    }
    return order.id;
  });
}
export async function confirm(input: ConfirmInput, customerId: string) {
  const db = await getDb();
  const prepared = await atomic(async (tx, add) => {
    const [row] = await tx
      .select({ payment: payments, order: orders })
      .from(payments)
      .innerJoin(orders, eq(orders.id, payments.orderId))
      .where(
        and(
          eq(payments.providerOrderId, input.orderId),
          eq(orders.customerId, customerId),
        ),
      );
    ensure(row, "주문을 찾을 수 없습니다.");
    ensure(
      row.payment.amount === input.amount && row.order.total === input.amount,
      "주문 금액이 일치하지 않습니다.",
    );
    ensure(
      !row.payment.paymentKey || row.payment.paymentKey === input.paymentKey,
      "주문에 연결된 결제 키가 다릅니다.",
    );
    if (row.payment.approvedAt) return { ...row.payment, completed: true };
    ensure(
      row.order.status === "pending",
      "취소·만료된 주문은 결제할 수 없습니다.",
    );
    ensure(
      row.payment.status !== "failed",
      "실패한 주문입니다. 새 주문으로 다시 시도해주세요.",
    );
    if (row.payment.status === "ready")
      ensure(
        row.order.expiresAt > new Date(),
        "주문이 만료됐습니다. 다시 신청해주세요.",
      );
    add(
      tx
        .update(payments)
        .set({
          paymentKey: input.paymentKey,
          status: "confirming",
          ...updated(),
        })
        .where(eq(payments.id, row.payment.id)),
    );
    add(
      tx
        .update(orders)
        .set({ paymentStatus: "processing", ...updated() })
        .where(eq(orders.id, row.order.id)),
    );
    return {
      ...row.payment,
      paymentKey: input.paymentKey,
      status: "confirming" as const,
      completed: false,
    };
  });
  if (prepared.completed) return prepared.orderId;
  try {
    let remote: TossPayment;
    try {
      remote = await toss.confirm(input, prepared.mode, prepared.idempotencyKey);
    } catch (error) {
      // A timeout or duplicate response may follow a successful debit; query before deciding.
      try {
        remote = await toss.find(input.paymentKey, prepared.mode);
      } catch {
        throw error;
      }
    }
    const id = await applyProvider(prepared.id, remote);
    ensure(
      remote.status === "DONE",
      "결제가 완료되지 않았습니다. 주문 상태를 확인해주세요.",
    );
    return id;
  } catch (error) {
    await markUnknown(prepared.id, error);
    throw error;
  }
}
export async function reconcile(paymentId: string) {
  const db = await getDb();
  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.id, paymentId));
  ensure(payment?.paymentKey, "조회할 결제 키가 없습니다.");
  if (payment.pendingRefundId) return retryRefund(payment.pendingRefundId);
  const remote = await toss.find(payment.paymentKey, payment.mode);
  return applyProvider(payment.id, remote);
}

/** 관리자 환불(전액). 멱등 요청키로 중복을 막고, 토스 취소 뒤 수강을 회수한다. */
export async function requestRefund(input: RefundInput, actorId: string) {
  const db = await getDb();
  const refund = await atomic(async (tx, add) => {
    const [existing] = await tx
      .select()
      .from(refunds)
      .where(eq(refunds.requestKey, input.requestKey));
    if (existing) {
      ensure(
        existing.orderId === input.orderId && existing.actorId === actorId,
        "다른 환불에 사용된 요청키입니다.",
      );
      return existing;
    }
    const [order] = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, input.orderId));
    const [payment] = await tx
      .select()
      .from(payments)
      .where(eq(payments.orderId, input.orderId));
    ensure(
      order && payment?.paymentKey && payment.status === "done",
      "환불 가능한 결제가 없습니다.",
    );
    ensure(!payment.pendingRefundId, "진행 중인 환불을 먼저 확인해주세요.");
    ensure(payment.refundedAmount === 0, "이미 환불된 결제입니다.");
    const id = uuid();
    const created: typeof refunds.$inferSelect = {
      id,
      orderId: order.id,
      paymentId: payment.id,
      requestKey: input.requestKey,
      amount: payment.amount,
      reason: input.reason,
      actorId,
      status: "pending",
      providerTransactionKey: null,
      lastError: null,
      ...stamp(),
    };
    add(tx.insert(refunds).values(created));
    add(
      tx
        .update(payments)
        .set({ pendingRefundId: id, ...updated() })
        .where(eq(payments.id, payment.id)),
    );
    add(
      audit(tx, actorId, "refund.requested", order.id, {
        refundId: id,
        amount: payment.amount,
      }),
    );
    return created;
  });
  if (refund.status === "succeeded") return refund.orderId;
  return retryRefund(refund.id);
}
export async function retryRefund(refundId: string) {
  const db = await getDb();
  const [refund] = await db
    .select()
    .from(refunds)
    .where(eq(refunds.id, refundId));
  ensure(refund, "환불을 찾을 수 없습니다.");
  if (refund.status === "succeeded") return refund.orderId;
  ensure(
    refund.status !== "failed",
    "실패한 환불입니다. 새 요청으로 진행해주세요.",
  );
  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.id, refund.paymentId));
  ensure(
    payment?.paymentKey && payment.pendingRefundId === refundId,
    "진행 중인 환불을 확인해주세요.",
  );
  const reason = `${refund.reason} [${refund.id}]`;
  try {
    // Reuse the same persisted idempotency key and body on every attempt.
    let remote = await toss.find(payment.paymentKey, payment.mode);
    verifyProvider(payment, remote);
    let cancellation = remote.cancels?.find(
      (c) =>
        c.cancelReason === reason &&
        c.cancelAmount === refund.amount &&
        c.cancelStatus === "DONE",
    );
    if (!cancellation) {
      // Beyond the provider's retention window, do not risk a second cancellation.
      ensure(
        Date.now() - refund.createdAt.getTime() < 24 * 60 * 60_000,
        "오래된 환불 요청입니다. 토스 취소 내역을 확인해주세요.",
        "REFUND_REVIEW",
      );
      remote = await toss.cancel(
        payment.paymentKey,
        refund.amount,
        reason,
        payment.mode,
        refund.id,
      );
      verifyProvider(payment, remote);
      cancellation = remote.cancels?.find(
        (c) =>
          c.cancelReason === reason &&
          c.cancelAmount === refund.amount &&
          c.cancelStatus === "DONE",
      );
    }
    ensure(cancellation, "환불 결과를 확인 중입니다.", "REFUND_PENDING");
    const transactionKey = cancellation.transactionKey;
    await atomic(async (tx, add) => {
      const [current] = await tx
        .select()
        .from(refunds)
        .where(eq(refunds.id, refundId));
      if (current.status === "succeeded") return;
      const [currentPayment] = await tx
        .select()
        .from(payments)
        .where(eq(payments.id, refund.paymentId));
      ensure(
        currentPayment.pendingRefundId === refundId,
        "환불 처리 상태가 변경되었습니다.",
      );
      const refundedAmount = Math.max(
        currentPayment.refundedAmount,
        remote.totalAmount - remote.balanceAmount,
      );
      await revokeByOrder(tx, add, refund.orderId, "환불");
      add(
        tx
          .update(refunds)
          .set({
            status: "succeeded",
            providerTransactionKey: transactionKey,
            lastError: null,
            ...updated(),
          })
          .where(eq(refunds.id, refundId)),
      );
      add(
        tx
          .update(payments)
          .set({
            status: "cancelled",
            refundedAmount,
            pendingRefundId: null,
            lastError: null,
            ...updated(),
          })
          .where(eq(payments.id, payment.id)),
      );
      add(
        tx
          .update(orders)
          .set({ status: "refunded", paymentStatus: "refunded", ...updated() })
          .where(eq(orders.id, refund.orderId)),
      );
      add(
        tx
          .update(refundRequests)
          .set({ status: "approved", ...updated() })
          .where(
            and(
              eq(refundRequests.orderId, refund.orderId),
              eq(refundRequests.status, "pending"),
            ),
          ),
      );
      add(
        audit(tx, refund.actorId, "refund.succeeded", refund.orderId, {
          refundId,
          amount: refund.amount,
        }),
      );
    });
    return refund.orderId;
  } catch (error) {
    await atomic(async (_db, add) => {
      add(
        db
          .update(refunds)
          .set({
            status: "unknown",
            lastError:
              error instanceof TossError ? error.code : "REFUND_REVIEW",
            ...updated(),
          })
          .where(
            and(
              eq(refunds.id, refundId),
              inArray(refunds.status, ["pending", "unknown"]),
            ),
          ),
      );
    });
    throw error;
  }
}

// ── 수강생 환불 신청 ─────────────────────────────────────────────
export async function createRefundRequest(
  input: RefundRequestInput,
  userId: string,
) {
  const db = await getDb();
  const settings = platformSettings();
  return atomic(async (tx, add) => {
    const [order] = await tx
      .select()
      .from(orders)
      .where(and(eq(orders.id, input.orderId), eq(orders.customerId, userId)));
    ensure(order, "주문을 찾을 수 없습니다.", "NOT_FOUND");
    ensure(
      order.status === "confirmed" && order.paymentStatus === "paid",
      "결제가 완료된 주문만 환불을 신청할 수 있습니다.",
    );
    const [payment] = await tx
      .select()
      .from(payments)
      .where(eq(payments.orderId, order.id));
    ensure(payment?.approvedAt && payment.status === "done", "환불 가능한 결제가 없습니다.");
    ensure(
      Date.now() - payment.approvedAt.getTime() <=
        settings.refundWindowDays * 24 * 60 * 60_000,
      `결제 후 ${settings.refundWindowDays}일 이내에만 환불을 신청할 수 있습니다.`,
    );
    const [enrollment] = await tx
      .select({ progressPercent: enrollments.progressPercent })
      .from(enrollments)
      .where(eq(enrollments.orderId, order.id));
    ensure(
      (enrollment?.progressPercent ?? 0) < settings.refundProgressLimit,
      `진도율 ${settings.refundProgressLimit}% 이상인 강의는 환불을 신청할 수 없습니다.`,
    );
    const [pending] = await tx
      .select({ id: refundRequests.id })
      .from(refundRequests)
      .where(
        and(
          eq(refundRequests.orderId, order.id),
          eq(refundRequests.status, "pending"),
        ),
      );
    ensure(!pending, "이미 접수된 환불 신청이 있습니다.");
    const id = uuid();
    add(
      tx.insert(refundRequests).values({
        id,
        orderId: order.id,
        userId,
        reason: input.reason,
        ...stamp(),
      }),
    );
    add(audit(tx, userId, "refund.request_created", order.id, { requestId: id }));
    return id;
  });
}
export async function findRefundRequests(filter: ListFilter, pageable: PageRequest) {
  const db = await getDb();
  const where = and(
    isNull(refundRequests.deletedAt),
    filter.status
      ? eq(refundRequests.status, filter.status as typeof refundRequests.$inferSelect.status)
      : undefined,
    filter.search
      ? or(
          like(orders.number, `%${filter.search}%`),
          like(orders.customerEmail, `%${filter.search}%`),
          like(orders.courseTitle, `%${filter.search}%`),
        )
      : undefined,
  );
  const rows = await db
    .select({ request: refundRequests, order: orders })
    .from(refundRequests)
    .innerJoin(orders, eq(orders.id, refundRequests.orderId))
    .where(where)
    .orderBy(
      sql`CASE WHEN ${refundRequests.status} = 'pending' THEN 0 ELSE 1 END`,
      desc(refundRequests.createdAt),
    )
    .limit(pageable.limit)
    .offset(offset(pageable));
  const [total] = await db
    .select({ value: count() })
    .from(refundRequests)
    .innerJoin(orders, eq(orders.id, refundRequests.orderId))
    .where(where);
  return paginate(rows, total.value, pageable);
}
/** 승인은 환불 처리까지 이어지고, 거절은 메모만 남긴다. */
export async function decideRefundRequest(
  input: RefundDecisionInput,
  actorId: string,
) {
  const db = await getDb();
  const request = await atomic(async (tx, add) => {
    const [row] = await tx
      .select()
      .from(refundRequests)
      .where(eq(refundRequests.id, input.requestId));
    ensure(row, "환불 신청을 찾을 수 없습니다.");
    if (row.status === "approved") return row;
    ensure(row.status === "pending", "이미 처리된 환불 신청입니다.");
    if (!input.approve) {
      add(
        tx
          .update(refundRequests)
          .set({
            status: "rejected",
            note: input.note,
            decidedBy: actorId,
            decidedAt: new Date(),
            ...updated(),
          })
          .where(eq(refundRequests.id, row.id)),
      );
      add(audit(tx, actorId, "refund.request_rejected", row.orderId, { requestId: row.id }));
      return { ...row, status: "rejected" as const };
    }
    add(
      tx
        .update(refundRequests)
        .set({ note: input.note, decidedBy: actorId, decidedAt: new Date(), ...updated() })
        .where(eq(refundRequests.id, row.id)),
    );
    return row;
  });
  if (request.status !== "pending") return request.orderId;
  return requestRefund(
    { orderId: request.orderId, requestKey: input.requestKey, reason: request.reason },
    actorId,
  );
}

export async function findAll(filter: ListFilter, pageable: PageRequest) {
  const db = await getDb();
  const where = and(
    isNull(payments.deletedAt),
    filter.status
      ? eq(payments.status, filter.status as typeof payments.$inferSelect.status)
      : undefined,
    filter.search
      ? or(
          like(payments.providerOrderId, `%${filter.search}%`),
          like(orders.customerEmail, `%${filter.search}%`),
        )
      : undefined,
  );
  const rows = await db
    .select({ payment: payments, customerEmail: orders.customerEmail, courseTitle: orders.courseTitle })
    .from(payments)
    .innerJoin(orders, eq(orders.id, payments.orderId))
    .where(where)
    .orderBy(desc(payments.createdAt))
    .limit(pageable.limit)
    .offset(offset(pageable));
  const [total] = await db
    .select({ value: count() })
    .from(payments)
    .innerJoin(orders, eq(orders.id, payments.orderId))
    .where(where);
  return paginate(rows, total.value, pageable);
}
export async function queueWebhook(eventKey: string, paymentKey: string) {
  const db = await getDb();
  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.paymentKey, paymentKey));
  ensure(payment, "등록된 결제가 아닙니다.", "NOT_FOUND");
  await atomic(async (_db, add) => {
    add(
      db
        .insert(webhookEvents)
        .values({ id: uuid(), eventKey, paymentKey, ...stamp() })
        .onConflictDoNothing({ target: webhookEvents.eventKey }),
    );
  });
}
export async function receiveWebhook(eventKey: string, paymentKey: string) {
  const db = await getDb();
  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.paymentKey, paymentKey));
  ensure(payment, "등록된 결제가 아닙니다.", "NOT_FOUND");
  const [event] = await db
    .select()
    .from(webhookEvents)
    .where(eq(webhookEvents.eventKey, eventKey));
  if (event.status === "processed") return;
  try {
    await reconcile(payment.id);
    await atomic(async (_db, add) => {
      add(
        db
          .update(webhookEvents)
          .set({
            status: "processed",
            attempts: sql`${webhookEvents.attempts} + 1`,
            lastError: null,
            ...updated(),
          })
          .where(eq(webhookEvents.id, event.id)),
      );
    });
  } catch (error) {
    await atomic(async (_db, add) => {
      add(
        db
          .update(webhookEvents)
          .set({
            status: "failed",
            attempts: sql`${webhookEvents.attempts} + 1`,
            lastError: "RECONCILIATION_REQUIRED",
            ...updated(),
          })
          .where(eq(webhookEvents.id, event.id)),
      );
    });
    throw error;
  }
}
export async function reconcilePending() {
  const db = await getDb();
  const pending = await db
    .select()
    .from(payments)
    .where(inArray(payments.status, ["confirming", "unknown"]))
    .orderBy(payments.updatedAt)
    .limit(30);
  const webhookRows = await db
    .select()
    .from(webhookEvents)
    .where(inArray(webhookEvents.status, ["pending", "failed"]))
    .orderBy(webhookEvents.updatedAt)
    .limit(30);
  const pendingRefunds = await db
    .select()
    .from(refunds)
    .where(inArray(refunds.status, ["pending", "unknown"]))
    .orderBy(refunds.updatedAt)
    .limit(30);
  let succeeded = 0;
  let failed = 0;
  for (const payment of pending) {
    try {
      await reconcile(payment.id);
      succeeded++;
    } catch {
      failed++;
    }
  }
  for (const refund of pendingRefunds) {
    try {
      await retryRefund(refund.id);
      succeeded++;
    } catch {
      failed++;
    }
  }
  for (const event of webhookRows) {
    try {
      await receiveWebhook(event.eventKey, event.paymentKey);
      succeeded++;
    } catch {
      failed++;
    }
  }
  return { succeeded, failed };
}
