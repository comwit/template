import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { id, timestamps } from "./shared-schema";
import { appAuthUser } from "../plugin/auth/app-schema";
import { courses } from "./catalog-schema";
import { products } from "./products-schema";

// ── 주문·결제·환불 ──────────────────────────────────────────────
/** 주문 1건 = 강의 1개 또는 디지털 상품 1개. 장바구니 없이 상세에서 바로 결제한다. */
export const orders = sqliteTable(
  "orders",
  {
    id: id(),
    number: text("number").notNull(),
    customerId: text("customer_id")
      .notNull()
      .references(() => appAuthUser.id),
    customerEmail: text("customer_email").notNull(),
    requestKey: text("request_key").notNull(),
    /** 결제 대상. course 면 courseId, product 면 productId 가 채워진다. */
    itemType: text("item_type", { enum: ["course", "product"] })
      .notNull()
      .default("course"),
    courseId: text("course_id").references(() => courses.id),
    productId: text("product_id").references(() => products.id),
    itemTitle: text("item_title").notNull(),
    status: text("status", {
      enum: ["pending", "confirmed", "cancelled", "expired", "refunded"],
    })
      .notNull()
      .default("pending"),
    paymentStatus: text("payment_status", {
      enum: ["free", "unpaid", "processing", "paid", "refunded", "failed", "review"],
    })
      .notNull()
      .default("unpaid"),
    listPrice: integer("list_price").notNull(),
    discount: integer("discount").notNull().default(0),
    couponId: text("coupon_id"),
    couponCode: text("coupon_code"),
    couponDiscount: integer("coupon_discount").notNull().default(0),
    total: integer("total").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("orders_number_uq").on(t.number),
    uniqueIndex("orders_request_uq").on(t.customerId, t.requestKey),
    index("orders_customer_idx").on(t.customerId, t.deletedAt, t.createdAt),
    index("orders_status_idx").on(t.deletedAt, t.status, t.createdAt),
    index("orders_course_idx").on(t.courseId, t.status),
    index("orders_product_idx").on(t.productId, t.status),
    check(
      "orders_item_check",
      sql`(${t.itemType} = 'course' AND ${t.courseId} IS NOT NULL) OR (${t.itemType} = 'product' AND ${t.productId} IS NOT NULL)`,
    ),
    index("orders_expiry_idx").on(t.status, t.expiresAt),
    check(
      "orders_amount_check",
      sql`${t.listPrice} >= 0 AND ${t.discount} >= 0 AND ${t.couponDiscount} >= 0 AND ${t.total} >= 0 AND ${t.total} = ${t.listPrice} - ${t.discount} - ${t.couponDiscount}`,
    ),
  ],
);

export const payments = sqliteTable(
  "payments",
  {
    id: id(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id),
    providerOrderId: text("provider_order_id").notNull(),
    paymentKey: text("payment_key"),
    status: text("status", {
      enum: ["ready", "confirming", "done", "cancelled", "failed", "unknown"],
    })
      .notNull()
      .default("ready"),
    amount: integer("amount").notNull(),
    refundedAmount: integer("refunded_amount").notNull().default(0),
    idempotencyKey: text("idempotency_key").notNull(),
    pendingRefundId: text("pending_refund_id"),
    mode: text("mode", { enum: ["test", "live"] }).notNull(),
    method: text("method"),
    receiptUrl: text("receipt_url"),
    lastError: text("last_error"),
    approvedAt: integer("approved_at", { mode: "timestamp_ms" }),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("payments_order_uq").on(t.orderId),
    uniqueIndex("payments_provider_order_uq").on(t.providerOrderId),
    uniqueIndex("payments_key_uq").on(t.paymentKey),
    uniqueIndex("payments_idempotency_uq").on(t.idempotencyKey),
    index("payments_status_idx").on(t.status, t.updatedAt),
    index("payments_date_idx").on(t.createdAt),
    check(
      "payments_amount_check",
      sql`${t.amount} > 0 AND ${t.refundedAmount} BETWEEN 0 AND ${t.amount}`,
    ),
  ],
);

/** 환불은 주문 1건 전액만 처리한다. */
export const refunds = sqliteTable(
  "refunds",
  {
    id: id(),
    paymentId: text("payment_id")
      .notNull()
      .references(() => payments.id),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id),
    requestKey: text("request_key").notNull(),
    status: text("status", {
      enum: ["pending", "succeeded", "failed", "unknown"],
    })
      .notNull()
      .default("pending"),
    amount: integer("amount").notNull(),
    reason: text("reason").notNull(),
    actorId: text("actor_id").notNull(),
    providerTransactionKey: text("provider_transaction_key"),
    lastError: text("last_error"),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("refunds_request_uq").on(t.requestKey),
    uniqueIndex("refunds_transaction_uq").on(t.providerTransactionKey),
    index("refunds_payment_idx").on(t.paymentId, t.status),
    index("refunds_order_idx").on(t.orderId, t.createdAt),
    index("refunds_status_idx").on(t.status, t.updatedAt),
    check("refunds_amount_check", sql`${t.amount} > 0`),
  ],
);

/** 수강생이 마이페이지에서 넣는 환불 신청. 운영자가 승인하면 refunds 로 이어진다. */
export const refundRequests = sqliteTable(
  "refund_requests",
  {
    id: id(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id),
    userId: text("user_id")
      .notNull()
      .references(() => appAuthUser.id),
    reason: text("reason").notNull(),
    status: text("status", { enum: ["pending", "approved", "rejected"] })
      .notNull()
      .default("pending"),
    note: text("note").notNull().default(""),
    decidedBy: text("decided_by"),
    decidedAt: integer("decided_at", { mode: "timestamp_ms" }),
    ...timestamps(),
  },
  (t) => [
    index("refund_requests_order_idx").on(t.orderId, t.status),
    index("refund_requests_list_idx").on(t.status, t.createdAt),
  ],
);

export const webhookEvents = sqliteTable(
  "webhook_events",
  {
    id: id(),
    eventKey: text("event_key").notNull(),
    paymentKey: text("payment_key").notNull(),
    status: text("status", { enum: ["pending", "processed", "failed"] })
      .notNull()
      .default("pending"),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("webhooks_key_uq").on(t.eventKey),
    index("webhooks_retry_idx").on(t.status, t.updatedAt),
    index("webhooks_payment_idx").on(t.paymentKey),
  ],
);
