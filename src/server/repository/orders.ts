import "server-only";
import { atomic, type AddStatement } from "./atomic";
import {
  and,
  count,
  desc,
  eq,
  inArray,
  isNull,
  like,
  lte,
  or,
  sql,
} from "drizzle-orm";
import { getDb } from "@/server/db";
import {
  auditLogs,
  inventoryMovements,
  inventoryReservations,
  orderItems,
  orders,
  payments,
  products,
  refunds,
  shipments,
  skus,
} from "@/server/db/schema";
import type { CheckoutInput, ListFilter, ShipmentInput } from "@/lib/commerce";
import {
  audit,
  ensure,
  offset,
  paginate,
  shopSettings,
  stamp,
  updated,
  type Executor,
} from "./commerce-support";
import { uuid } from "./id";
import { enqueue } from "./notifications";
import type { PageRequest } from "./types";

export async function findAll(
  filter: ListFilter,
  pageable: PageRequest,
  customerId?: string,
) {
  const db = await getDb();
  const where = and(
    isNull(orders.deletedAt),
    customerId ? eq(orders.customerId, customerId) : undefined,
    filter.status
      ? eq(orders.status, filter.status as typeof orders.$inferSelect.status)
      : undefined,
    filter.search
      ? or(
          like(orders.number, `%${filter.search}%`),
          like(orders.customerEmail, `%${filter.search}%`),
        )
      : undefined,
  );
  const items = await db
    .select()
    .from(orders)
    .where(where)
    .orderBy(desc(orders.createdAt), desc(orders.id))
    .limit(pageable.limit)
    .offset(offset(pageable));
  const [total] = await db.select({ value: count() }).from(orders).where(where);
  return paginate(items, total.value, pageable);
}
export async function findById(id: string, customerId?: string) {
  const db = await getDb();
  const [order] = await db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.id, id),
        isNull(orders.deletedAt),
        customerId ? eq(orders.customerId, customerId) : undefined,
      ),
    );
  ensure(order, "주문을 찾을 수 없습니다.", "NOT_FOUND");
  const [items, paymentRows, refundRows, shipmentRows, history] =
    await Promise.all([
      db.select().from(orderItems).where(eq(orderItems.orderId, id)),
      db.select().from(payments).where(eq(payments.orderId, id)),
      db
        .select()
        .from(refunds)
        .where(eq(refunds.orderId, id))
        .orderBy(desc(refunds.createdAt)),
      db.select().from(shipments).where(eq(shipments.orderId, id)),
      db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.entityId, id))
        .orderBy(desc(auditLogs.createdAt))
        .limit(100),
    ]);
  return {
    ...order,
    items,
    payment: paymentRows[0] ?? null,
    refunds: refundRows,
    shipment: shipmentRows[0] ?? null,
    history,
  };
}
export async function create(
  input: CheckoutInput,
  customer: { id: string; email: string },
) {
  const db = await getDb();
  const settings = shopSettings();
  return atomic(async (tx, add) => {
    const [old] = await tx
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.customerId, customer.id),
          eq(orders.requestKey, input.requestKey),
        ),
      );
    if (old) {
      const oldItems = await tx
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, old.id));
      ensure(
        old.shippingAddress === JSON.stringify(input.address) &&
          oldItems.length === input.items.length &&
          oldItems.every((i) =>
            input.items.some(
              (n) => n.skuId === i.skuId && n.quantity === i.quantity,
            ),
          ),
        "다른 주문에 사용된 요청키입니다.",
      );
      return old;
    }
    const rows = await tx
      .select({ sku: skus, product: products })
      .from(skus)
      .innerJoin(products, eq(products.id, skus.productId))
      .where(
        and(
          inArray(
            skus.id,
            input.items.map((i) => i.skuId),
          ),
          isNull(skus.deletedAt),
          eq(skus.active, true),
          isNull(products.deletedAt),
          eq(products.status, "active"),
        ),
      );
    ensure(
      rows.length === input.items.length,
      "판매 중인 SKU만 주문할 수 있습니다.",
    );
    let subtotal = 0;
    for (const item of input.items) {
      const row = rows.find((r) => r.sku.id === item.skuId)!;
      ensure(
        Number.isInteger(item.quantity) &&
          item.quantity > 0 &&
          item.quantity <= 99,
        "주문 수량을 확인해주세요.",
      );
      subtotal += row.sku.price * item.quantity;
    }
    ensure(
      Number.isSafeInteger(subtotal) &&
        subtotal > 0 &&
        subtotal <= 1_000_000_000,
      "결제 가능한 주문 금액을 초과했습니다.",
    );
    const shippingFee =
      subtotal >= settings.freeShippingThreshold ? 0 : settings.shippingFee;
    const id = uuid();
    const expiresAt = new Date(
      Date.now() + settings.reservationMinutes * 60_000,
    );
    const order: typeof orders.$inferSelect = {
      id,
      number: `order-${id}`,
      customerId: customer.id,
      customerEmail: customer.email,
      requestKey: input.requestKey,
      subtotal,
      shippingFee,
      total: subtotal + shippingFee,
      shippingAddress: JSON.stringify(input.address),
      expiresAt,
      status: "pending",
      paymentStatus: "unpaid",
      fulfillmentStatus: "unfulfilled",
      ...stamp(),
    };
    add(tx.insert(orders).values(order));
    for (const item of input.items) {
      const row = rows.find((r) => r.sku.id === item.skuId)!;
      add(
        tx
          .update(skus)
          .set({
            reserved: sql`${skus.reserved} + ${item.quantity}`,
            ...updated(),
          })
          .where(eq(skus.id, item.skuId)),
      );
      ensure(
        row.sku.onHand - row.sku.reserved >= item.quantity,
        `${row.product.name}의 재고가 부족합니다.`,
        "OUT_OF_STOCK",
      );
      const images: unknown[] = JSON.parse(row.product.images);
      add(
        tx.insert(orderItems).values({
          id: uuid(),
          orderId: id,
          skuId: item.skuId,
          productName: row.product.name,
          skuCode: row.sku.code,
          options: row.sku.options,
          unitPrice: row.sku.price,
          quantity: item.quantity,
          image: images[0] ? JSON.stringify(images[0]) : null,
          ...stamp(),
        }),
      );
      add(
        tx.insert(inventoryReservations).values({
          id: uuid(),
          orderId: id,
          skuId: item.skuId,
          quantity: item.quantity,
          expiresAt,
          ...stamp(),
        }),
      );
    }
    add(
      tx.insert(payments).values({
        id: uuid(),
        orderId: id,
        providerOrderId: order.number,
        amount: order.total,
        idempotencyKey: uuid(),
        mode: settings.mode,
        ...stamp(),
      }),
    );
    add(audit(tx, customer.id, "order.created", id));
    return order;
  });
}
export async function releaseReservations(
  tx: Executor,
  add: AddStatement,
  orderId: string,
) {
  const reservations = await tx
    .select()
    .from(inventoryReservations)
    .where(
      and(
        eq(inventoryReservations.orderId, orderId),
        eq(inventoryReservations.status, "held"),
      ),
    );
  for (const row of reservations) {
    add(
      tx
        .update(skus)
        .set({
          reserved: sql`${skus.reserved} - ${row.quantity}`,
          ...updated(),
        })
        .where(eq(skus.id, row.skuId)),
    );
    add(
      tx
        .update(inventoryReservations)
        .set({ status: "released", ...updated() })
        .where(eq(inventoryReservations.id, row.id)),
    );
  }
}
export async function consumeReservations(
  tx: Executor,
  add: AddStatement,
  orderId: string,
) {
  const reservations = await tx
    .select()
    .from(inventoryReservations)
    .where(eq(inventoryReservations.orderId, orderId));
  ensure(
    reservations.length && reservations.every((r) => r.status === "held"),
    "재고 예약 확인이 필요합니다.",
    "STOCK_REVIEW",
  );
  for (const row of reservations) {
    add(
      tx
        .update(skus)
        .set({
          reserved: sql`${skus.reserved} - ${row.quantity}`,
          onHand: sql`${skus.onHand} - ${row.quantity}`,
          ...updated(),
        })
        .where(eq(skus.id, row.skuId)),
    );
    add(
      tx
        .update(inventoryReservations)
        .set({ status: "consumed", ...updated() })
        .where(eq(inventoryReservations.id, row.id)),
    );
    add(
      tx.insert(inventoryMovements).values({
        id: uuid(),
        skuId: row.skuId,
        orderId,
        quantity: -row.quantity,
        kind: "sale",
        reason: "결제 승인",
        actorId: "payment",
        requestKey: `sale-${row.id}`,
        ...stamp(),
      }),
    );
  }
}
export async function cancelUnpaid(
  id: string,
  actorId: string,
  customerId?: string,
) {
  const db = await getDb();
  await atomic(async (tx, add) => {
    const [order] = await tx
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.id, id),
          customerId ? eq(orders.customerId, customerId) : undefined,
        ),
      );
    ensure(order, "주문을 찾을 수 없습니다.");
    if (order.status === "cancelled" || order.status === "expired") return;
    const [payment] = await tx
      .select()
      .from(payments)
      .where(eq(payments.orderId, id));
    ensure(
      order.status === "pending" &&
        ["ready", "failed"].includes(payment.status),
      "승인 중이거나 결제된 주문은 결제 확인 또는 환불 처리가 필요합니다.",
    );
    await releaseReservations(tx, add, id);
    add(
      tx
        .update(orders)
        .set({ status: "cancelled", ...updated() })
        .where(eq(orders.id, id)),
    );
    add(
      tx
        .update(payments)
        .set({ status: "failed", ...updated() })
        .where(eq(payments.orderId, id)),
    );
    add(audit(tx, actorId, "order.cancelled", id));
    enqueue(tx, add, "cancelled", order);
  });
}
export async function expirePending() {
  const db = await getDb();
  return atomic(async (tx, add) => {
    const rows = await tx
      .select({ order: orders, payment: payments })
      .from(orders)
      .innerJoin(payments, eq(payments.orderId, orders.id))
      .where(
        and(
          eq(orders.status, "pending"),
          lte(orders.expiresAt, new Date()),
          inArray(payments.status, ["ready", "failed"]),
        ),
      )
      .limit(100);
    for (const { order } of rows) {
      await releaseReservations(tx, add, order.id);
      add(
        tx
          .update(orders)
          .set({ status: "expired", ...updated() })
          .where(eq(orders.id, order.id)),
      );
      add(
        tx
          .update(payments)
          .set({ status: "failed", ...updated() })
          .where(eq(payments.orderId, order.id)),
      );
      add(audit(tx, "system", "order.expired", order.id));
    }
    return rows.length;
  });
}
export async function ship(input: ShipmentInput, actorId: string) {
  const db = await getDb();
  await atomic(async (tx, add) => {
    const [order] = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, input.orderId));
    ensure(
      order &&
        order.status === "confirmed" &&
        ["paid", "partially_refunded"].includes(order.paymentStatus),
      "결제가 확인된 주문만 발송할 수 있습니다.",
    );
    const [payment] = await tx
      .select()
      .from(payments)
      .where(eq(payments.orderId, input.orderId));
    ensure(!payment.pendingRefundId, "진행 중인 환불을 먼저 확인해주세요.");
    const remainingItems = await tx
      .select({ id: orderItems.id })
      .from(orderItems)
      .where(
        and(
          eq(orderItems.orderId, input.orderId),
          sql`${orderItems.refundedQuantity} < ${orderItems.quantity}`,
        ),
      )
      .limit(1);
    ensure(
      remainingItems.length,
      "모든 상품이 환불된 주문은 발송할 수 없습니다.",
    );
    ensure(
      order.fulfillmentStatus === "unfulfilled",
      "이미 발송한 주문입니다.",
    );
    add(
      tx.insert(shipments).values({
        id: uuid(),
        orderId: input.orderId,
        carrier: input.carrier,
        trackingNumber: input.trackingNumber,
        shippedAt: new Date(),
        ...stamp(),
      }),
    );
    add(
      tx
        .update(orders)
        .set({ fulfillmentStatus: "shipped", ...updated() })
        .where(eq(orders.id, input.orderId)),
    );
    enqueue(tx, add, "shipped", order, input);
    add(
      audit(tx, actorId, "shipment.created", input.orderId, {
        carrier: input.carrier,
        trackingNumber: input.trackingNumber,
      }),
    );
  });
}
export async function deliver(orderId: string, actorId: string) {
  const db = await getDb();
  await atomic(async (tx, add) => {
    const changed = await tx
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.id, orderId),
          eq(orders.status, "confirmed"),
          eq(orders.fulfillmentStatus, "shipped"),
        ),
      );
    add(
      tx
        .update(orders)
        .set({
          fulfillmentStatus: "delivered",
          status: "completed",
          ...updated(),
        })
        .where(eq(orders.id, orderId)),
    );
    ensure(changed.length, "배송 중인 주문만 배송 완료로 처리할 수 있습니다.");
    const [payment] = await tx
      .select()
      .from(payments)
      .where(eq(payments.orderId, orderId));
    ensure(!payment.pendingRefundId, "진행 중인 환불을 먼저 확인해주세요.");
    add(
      tx
        .update(shipments)
        .set({ status: "delivered", deliveredAt: new Date(), ...updated() })
        .where(eq(shipments.orderId, orderId)),
    );
    add(audit(tx, actorId, "shipment.delivered", orderId));
    enqueue(tx, add, "delivered", changed[0]);
  });
}
