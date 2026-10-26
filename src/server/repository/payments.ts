import "server-only";
import { atomic, type AddStatement } from "./atomic";
import { and, count, desc, eq, inArray, isNull, like, sql } from "drizzle-orm";
import { getDb } from "@/server/db";
import {
  inventoryMovements,
  orderItems,
  orders,
  payments,
  refundItems,
  refunds,
  skus,
  webhookEvents,
} from "@/server/db/schema";
import { toss, TossError, type TossPayment } from "@/server/payments";
import type { ConfirmInput, ListFilter, RefundInput } from "@/lib/commerce";
import {
  audit,
  CommerceError,
  ensure,
  offset,
  paginate,
  stamp,
  updated,
} from "./commerce-support";
import { consumeReservations, releaseReservations } from "./orders";
import { uuid } from "./id";
import { enqueue } from "./notifications";
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
      : error instanceof CommerceError
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
    if (rows.length)
      add(
        tx
          .update(payments)
          .set({ status: "unknown", lastError: code, ...updated() })
          .where(eq(payments.id, id)),
      );
    if (rows.length)
      add(
        tx
          .update(orders)
          .set({ paymentStatus: "review", ...updated() })
          .where(eq(orders.id, rows[0].orderId)),
      );
  });
}
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
      throw new CommerceError(
        "결제 승인이 아직 확인되지 않았습니다.",
        "PAYMENT_PENDING",
      );
    if (["ABORTED", "EXPIRED"].includes(remote.status)) {
      ensure(!payment.approvedAt, "이미 승인된 결제의 상태 확인이 필요합니다.");
      await releaseReservations(tx, add, order.id);
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
    if (!payment.approvedAt) {
      ensure(
        order.status === "pending",
        "취소·만료된 주문의 승인 확인이 필요합니다.",
        "STOCK_REVIEW",
      );
      await consumeReservations(tx, add, order.id);
      if (remote.status === "DONE") enqueue(tx, add, "paid", order);
      add(
        audit(tx, "payment", "payment.approved", order.id, {
          amount: payment.amount,
        }),
      );
    }
    const fullyCancelled = remote.status === "CANCELED";
    const partiallyCancelled = remote.status === "PARTIAL_CANCELED";
    ensure(
      fullyCancelled
        ? remote.balanceAmount === 0
        : partiallyCancelled
          ? refunded > 0 && remote.balanceAmount > 0
          : refunded === 0,
      "결제 잔액이 상태와 일치하지 않습니다.",
    );
    add(
      tx
        .update(payments)
        .set({
          status: fullyCancelled
            ? "cancelled"
            : partiallyCancelled
              ? "partial_cancelled"
              : "done",
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
    // External provider refunds change balances but never invent a physical stock return.
    add(
      tx
        .update(orders)
        .set({
          status: fullyCancelled
            ? "cancelled"
            : order.status === "completed"
              ? "completed"
              : "confirmed",
          paymentStatus: fullyCancelled
            ? "refunded"
            : partiallyCancelled
              ? "partially_refunded"
              : "paid",
          ...updated(),
        })
        .where(eq(orders.id, order.id)),
    );
    if (refunded > payment.refundedAmount)
      enqueue(tx, add, "refunded", order, { refundedAmount: refunded });
    if (refunded > payment.refundedAmount)
      add(
        audit(tx, "payment", "payment.balance_synced", order.id, {
          refundedAmount: refunded,
        }),
      );
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
        "주문이 만료됐습니다. 다시 주문해주세요.",
      );
    const payment = {
      ...row.payment,
      paymentKey: input.paymentKey,
      status: "confirming" as const,
      ...updated(),
    };
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
    return { ...payment, completed: false };
  });
  if (prepared.completed) return prepared.orderId;
  try {
    let remote: TossPayment;
    try {
      remote = await toss.confirm(
        input,
        prepared.mode,
        prepared.idempotencyKey,
      );
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
export async function requestRefund(input: RefundInput, actorId: string) {
  const db = await getDb();
  const refund = await atomic(async (tx, add) => {
    const [existing] = await tx
      .select()
      .from(refunds)
      .where(eq(refunds.requestKey, input.requestKey));
    if (existing) {
      const existingItems = await tx
        .select()
        .from(refundItems)
        .where(eq(refundItems.refundId, existing.id));
      ensure(
        existing.orderId === input.orderId &&
          existing.actorId === actorId &&
          existing.reason === input.reason &&
          existing.restock === input.restock &&
          Boolean(existing.shippingAmount) === input.refundShipping &&
          existingItems.length === input.items.length &&
          existingItems.every((i) =>
            input.items.some(
              (n) =>
                n.orderItemId === i.orderItemId && n.quantity === i.quantity,
            ),
          ),
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
      order &&
        payment?.paymentKey &&
        ["done", "partial_cancelled"].includes(payment.status),
      "환불 가능한 결제가 없습니다.",
    );
    ensure(!payment.pendingRefundId, "진행 중인 환불을 먼저 확인해주세요.");
    const items = await tx
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, input.orderId));
    const previous = await tx
      .select()
      .from(refunds)
      .where(
        and(
          eq(refunds.orderId, input.orderId),
          eq(refunds.status, "succeeded"),
        ),
      );
    const accountedRefunds = previous.reduce((sum, r) => sum + r.amount, 0);
    ensure(
      accountedRefunds === payment.refundedAmount,
      "토스에서 직접 취소된 내역이 있습니다. 환불 항목 대사를 먼저 완료해주세요.",
      "EXTERNAL_REFUND_REVIEW",
    );
    const shippingRefunded = previous.reduce(
      (sum, r) => sum + r.shippingAmount,
      0,
    );
    const shippingAmount = input.refundShipping
      ? order.shippingFee - shippingRefunded
      : 0;
    ensure(
      !input.refundShipping || shippingAmount > 0,
      "환불할 배송비가 없습니다.",
    );
    let amount = shippingAmount;
    for (const request of input.items) {
      const item = items.find((i) => i.id === request.orderItemId);
      ensure(
        item && request.quantity <= item.quantity - item.refundedQuantity,
        "환불 수량을 확인해주세요.",
      );
      amount += item.unitPrice * request.quantity;
    }
    ensure(
      amount > 0 && amount <= payment.amount - payment.refundedAmount,
      "환불 가능한 잔액을 초과했습니다.",
    );
    const id = uuid();
    const created: typeof refunds.$inferSelect = {
      id,
      orderId: order.id,
      paymentId: payment.id,
      requestKey: input.requestKey,
      amount,
      shippingAmount,
      reason: input.reason,
      restock: input.restock,
      actorId,
      status: "pending",
      providerTransactionKey: null,
      lastError: null,
      ...stamp(),
    };
    add(tx.insert(refunds).values(created));
    for (const request of input.items)
      add(
        tx.insert(refundItems).values({
          id: uuid(),
          refundId: id,
          orderItemId: request.orderItemId,
          quantity: request.quantity,
          amount:
            items.find((i) => i.id === request.orderItemId)!.unitPrice *
            request.quantity,
          ...stamp(),
        }),
      );
    add(
      tx
        .update(payments)
        .set({ pendingRefundId: id, ...updated() })
        .where(eq(payments.id, payment.id)),
    );
    add(
      audit(tx, actorId, "refund.requested", order.id, {
        refundId: id,
        amount,
        restock: input.restock,
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
      const items = await tx
        .select({ refundItem: refundItems, item: orderItems })
        .from(refundItems)
        .innerJoin(orderItems, eq(orderItems.id, refundItems.orderItemId))
        .where(eq(refundItems.refundId, refundId));
      for (const { refundItem, item } of items) {
        add(
          tx
            .update(orderItems)
            .set({
              refundedQuantity: sql`${orderItems.refundedQuantity} + ${refundItem.quantity}`,
              ...updated(),
            })
            .where(eq(orderItems.id, item.id)),
        );
        ensure(
          item.refundedQuantity + refundItem.quantity <= item.quantity,
          "환불 수량 대사가 필요합니다.",
        );
        if (refund.restock) {
          add(
            tx
              .update(skus)
              .set({
                onHand: sql`${skus.onHand} + ${refundItem.quantity}`,
                ...updated(),
              })
              .where(eq(skus.id, item.skuId)),
          );
          add(
            tx.insert(inventoryMovements).values({
              id: uuid(),
              skuId: item.skuId,
              orderId: refund.orderId,
              quantity: refundItem.quantity,
              kind: "return",
              reason: refund.reason,
              actorId: refund.actorId,
              requestKey: `return-${refundItem.id}`,
              ...stamp(),
            }),
          );
        }
      }
      const refundedAmount = Math.max(
        currentPayment.refundedAmount,
        remote.totalAmount - remote.balanceAmount,
      );
      const all = refundedAmount === currentPayment.amount;
      const [notifiedOrder] = await tx
        .select()
        .from(orders)
        .where(eq(orders.id, refund.orderId));
      enqueue(tx, add, "refunded", notifiedOrder, { refundedAmount });
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
            status: all ? "cancelled" : "partial_cancelled",
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
          .set({
            ...(all ? { status: "cancelled" as const } : {}),
            paymentStatus: all ? "refunded" : "partially_refunded",
            ...updated(),
          })
          .where(eq(orders.id, refund.orderId)),
      );
      add(
        audit(tx, refund.actorId, "refund.succeeded", refund.orderId, {
          refundId,
          amount: refund.amount,
          restock: refund.restock,
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
export async function findAll(filter: ListFilter, pageable: PageRequest) {
  const db = await getDb();
  const where = and(
    isNull(payments.deletedAt),
    filter.status
      ? eq(
          payments.status,
          filter.status as typeof payments.$inferSelect.status,
        )
      : undefined,
    filter.search
      ? like(payments.providerOrderId, `%${filter.search}%`)
      : undefined,
  );
  const rows = await db
    .select()
    .from(payments)
    .where(where)
    .orderBy(desc(payments.createdAt))
    .limit(pageable.limit)
    .offset(offset(pageable));
  const [total] = await db
    .select({ value: count() })
    .from(payments)
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
  return;
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
