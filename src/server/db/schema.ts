import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { appAuthUser } from "./plugin/auth/app-schema";
export * from "./plugin/auth/app-schema";
export * from "./plugin/auth/admin-schema";

const timestamps = () => ({
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
});
const id = () => text("id").primaryKey();

export const categories = sqliteTable(
  "categories",
  {
    id: id(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("categories_slug_uq").on(t.slug),
    index("categories_list_idx").on(t.deletedAt, t.name),
  ],
);

export const products = sqliteTable(
  "products",
  {
    id: id(),
    categoryId: text("category_id").references(() => categories.id),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description").notNull().default(""),
    status: text("status", { enum: ["draft", "active", "archived"] })
      .notNull()
      .default("draft"),
    images: text("images").notNull().default("[]"),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("products_slug_uq").on(t.slug),
    index("products_list_idx").on(t.deletedAt, t.status, t.createdAt),
    index("products_category_idx").on(t.categoryId, t.deletedAt),
    index("products_name_idx").on(t.name),
  ],
);

export const skus = sqliteTable(
  "skus",
  {
    id: id(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id),
    code: text("code").notNull(),
    optionKey: text("option_key").notNull(),
    options: text("options").notNull().default("[]"),
    price: integer("price").notNull(),
    onHand: integer("on_hand").notNull().default(0),
    reserved: integer("reserved").notNull().default(0),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("skus_code_uq").on(t.code),
    uniqueIndex("skus_options_uq").on(t.productId, t.optionKey),
    index("skus_stock_idx").on(t.deletedAt, t.active, t.onHand),
    check(
      "skus_stock_check",
      sql`${t.onHand} >= 0 AND ${t.reserved} >= 0 AND ${t.reserved} <= ${t.onHand}`,
    ),
    check("skus_price_check", sql`${t.price} > 0`),
  ],
);

export const carts = sqliteTable(
  "carts",
  {
    id: id(),
    customerId: text("customer_id")
      .notNull()
      .references(() => appAuthUser.id),
    ...timestamps(),
  },
  (t) => [uniqueIndex("carts_customer_uq").on(t.customerId)],
);
export const cartItems = sqliteTable(
  "cart_items",
  {
    id: id(),
    cartId: text("cart_id")
      .notNull()
      .references(() => carts.id),
    skuId: text("sku_id")
      .notNull()
      .references(() => skus.id),
    quantity: integer("quantity").notNull(),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("cart_items_sku_uq").on(t.cartId, t.skuId),
    index("cart_items_sku_idx").on(t.skuId),
    check("cart_items_quantity_check", sql`${t.quantity} BETWEEN 1 AND 99`),
  ],
);

export const orders = sqliteTable(
  "orders",
  {
    id: id(),
    number: text("number").notNull(),
    customerId: text("customer_id")
      .notNull()
      .references(() => appAuthUser.id),
    requestKey: text("request_key").notNull(),
    status: text("status", {
      enum: ["pending", "confirmed", "cancelled", "completed", "expired"],
    })
      .notNull()
      .default("pending"),
    paymentStatus: text("payment_status", {
      enum: [
        "unpaid",
        "processing",
        "paid",
        "partially_refunded",
        "refunded",
        "failed",
        "review",
      ],
    })
      .notNull()
      .default("unpaid"),
    fulfillmentStatus: text("fulfillment_status", {
      enum: ["unfulfilled", "shipped", "delivered"],
    })
      .notNull()
      .default("unfulfilled"),
    subtotal: integer("subtotal").notNull(),
    shippingFee: integer("shipping_fee").notNull(),
    total: integer("total").notNull(),
    shippingAddress: text("shipping_address").notNull(),
    customerEmail: text("customer_email").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("orders_number_uq").on(t.number),
    uniqueIndex("orders_request_uq").on(t.customerId, t.requestKey),
    index("orders_customer_idx").on(t.customerId, t.deletedAt, t.createdAt),
    index("orders_status_idx").on(t.deletedAt, t.status, t.createdAt),
    index("orders_payment_idx").on(t.paymentStatus, t.createdAt),
    index("orders_expiry_idx").on(t.status, t.expiresAt),
    check(
      "orders_amount_check",
      sql`${t.subtotal} >= 0 AND ${t.shippingFee} >= 0 AND ${t.total} = ${t.subtotal} + ${t.shippingFee}`,
    ),
  ],
);

export const orderItems = sqliteTable(
  "order_items",
  {
    id: id(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id),
    skuId: text("sku_id")
      .notNull()
      .references(() => skus.id),
    productName: text("product_name").notNull(),
    skuCode: text("sku_code").notNull(),
    options: text("options").notNull(),
    image: text("image"),
    unitPrice: integer("unit_price").notNull(),
    quantity: integer("quantity").notNull(),
    refundedQuantity: integer("refunded_quantity").notNull().default(0),
    ...timestamps(),
  },
  (t) => [
    index("order_items_order_idx").on(t.orderId),
    index("order_items_sku_idx").on(t.skuId),
    check(
      "order_items_quantity_check",
      sql`${t.quantity} > 0 AND ${t.refundedQuantity} BETWEEN 0 AND ${t.quantity}`,
    ),
    check("order_items_price_check", sql`${t.unitPrice} > 0`),
  ],
);

export const inventoryReservations = sqliteTable(
  "inventory_reservations",
  {
    id: id(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id),
    skuId: text("sku_id")
      .notNull()
      .references(() => skus.id),
    quantity: integer("quantity").notNull(),
    status: text("status", { enum: ["held", "consumed", "released"] })
      .notNull()
      .default("held"),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("reservations_order_sku_uq").on(t.orderId, t.skuId),
    index("reservations_expiry_idx").on(t.status, t.expiresAt),
    index("reservations_sku_idx").on(t.skuId),
    check("reservations_quantity_check", sql`${t.quantity} > 0`),
  ],
);

export const inventoryMovements = sqliteTable(
  "inventory_movements",
  {
    id: id(),
    skuId: text("sku_id")
      .notNull()
      .references(() => skus.id),
    orderId: text("order_id").references(() => orders.id),
    quantity: integer("quantity").notNull(),
    kind: text("kind", { enum: ["adjustment", "sale", "return"] }).notNull(),
    reason: text("reason").notNull(),
    actorId: text("actor_id").notNull(),
    requestKey: text("request_key").notNull(),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("movements_request_uq").on(t.requestKey),
    index("movements_sku_idx").on(t.skuId, t.createdAt),
    index("movements_order_idx").on(t.orderId),
    index("movements_date_idx").on(t.createdAt),
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
      enum: [
        "ready",
        "confirming",
        "done",
        "partial_cancelled",
        "cancelled",
        "failed",
        "unknown",
      ],
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
    shippingAmount: integer("shipping_amount").notNull().default(0),
    reason: text("reason").notNull(),
    restock: integer("restock", { mode: "boolean" }).notNull().default(false),
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
    check(
      "refunds_amount_check",
      sql`${t.amount} > 0 AND ${t.shippingAmount} BETWEEN 0 AND ${t.amount}`,
    ),
  ],
);
export const refundItems = sqliteTable(
  "refund_items",
  {
    id: id(),
    refundId: text("refund_id")
      .notNull()
      .references(() => refunds.id),
    orderItemId: text("order_item_id")
      .notNull()
      .references(() => orderItems.id),
    quantity: integer("quantity").notNull(),
    amount: integer("amount").notNull(),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("refund_items_uq").on(t.refundId, t.orderItemId),
    index("refund_items_order_item_idx").on(t.orderItemId),
    check(
      "refund_items_quantity_check",
      sql`${t.quantity} > 0 AND ${t.amount} > 0`,
    ),
  ],
);
export const shipments = sqliteTable(
  "shipments",
  {
    id: id(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id),
    carrier: text("carrier").notNull(),
    trackingNumber: text("tracking_number").notNull(),
    status: text("status", { enum: ["shipped", "delivered"] })
      .notNull()
      .default("shipped"),
    shippedAt: integer("shipped_at", { mode: "timestamp_ms" }).notNull(),
    deliveredAt: integer("delivered_at", { mode: "timestamp_ms" }),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("shipments_order_uq").on(t.orderId),
    index("shipments_tracking_idx").on(t.carrier, t.trackingNumber),
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
export const auditLogs = sqliteTable(
  "audit_logs",
  {
    id: id(),
    actorId: text("actor_id").notNull(),
    action: text("action").notNull(),
    entityId: text("entity_id").notNull(),
    detail: text("detail").notNull(),
    ...timestamps(),
  },
  (t) => [
    index("audit_entity_idx").on(t.entityId, t.createdAt),
    index("audit_actor_idx").on(t.actorId, t.createdAt),
  ],
);
export const mediaAssets = sqliteTable(
  "media_assets",
  {
    id: id(),
    ownerId: text("owner_id").notNull(),
    storageKey: text("storage_key").notNull(),
    image: text("image"),
    status: text("status", { enum: ["pending", "ready", "deleted"] })
      .notNull()
      .default("pending"),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("media_storage_key_uq").on(t.storageKey),
    index("media_owner_idx").on(t.ownerId, t.status, t.createdAt),
  ],
);

/** Durable transactional notification outbox. */
export const notifications = sqliteTable(
  "notifications",
  {
    id: id(),
    eventKey: text("event_key").notNull(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id),
    event: text("event", {
      enum: ["paid", "shipped", "delivered", "refunded", "cancelled"],
    }).notNull(),
    channel: text("channel", { enum: ["sms", "alimtalk"] }).notNull(),
    recipient: text("recipient").notNull(),
    message: text("message").notNull(),
    status: text("status", {
      enum: [
        "pending",
        "sending",
        "submitted",
        "delivered",
        "failed",
        "unknown",
        "skipped",
      ],
    })
      .notNull()
      .default("pending"),
    attempts: integer("attempts").notNull().default(0),
    attemptKey: text("attempt_key"),
    messageId: text("message_id"),
    lastError: text("last_error"),
    attemptedAt: integer("attempted_at", { mode: "timestamp_ms" }),
    nextCheckAt: integer("next_check_at", { mode: "timestamp_ms" }).notNull(),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("notifications_event_uq").on(t.eventKey),
    index("notifications_worker_idx").on(t.status, t.nextCheckAt),
    index("notifications_order_idx").on(t.orderId, t.createdAt),
    index("notifications_date_idx").on(t.createdAt, t.id),
    index("notifications_message_idx").on(t.messageId),
  ],
);

/** Global commerce revision: optimistic commits fail atomically when reads became stale. */
export const commerceRevision = sqliteTable(
  "commerce_revision",
  {
    id: text("id").primaryKey(),
    revision: integer("revision").notNull(),
  },
  (t) => [check("commerce_revision_valid", sql`${t.revision} >= 0`)],
);
