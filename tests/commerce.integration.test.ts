import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { eq } from "drizzle-orm";
import { v7 as uuid } from "uuid";
import type { Database } from "@/server/db";
import * as schema from "@/server/db/schema";
import type { CheckoutInput, ProductInput, RefundInput } from "@/lib/commerce";
import type { TossPayment } from "@/server/payments";

const context = vi.hoisted(() => ({
  db: null as Database | null,
  notificationsEnabled: false,
}));
vi.mock("@/server/db", () => ({ getDb: async () => context.db! }));
vi.mock("@/server/config", () => ({
  config: {
    SHOP_NAME: "Test shop",
    get SOLAPI_ENABLED() {
      return context.notificationsEnabled;
    },
    SOLAPI_API_KEY: "fixture-key",
    SOLAPI_API_SECRET: "fixture-secret",
    SOLAPI_SENDER_NUMBER: "0212345678",
    SOLAPI_CHANNEL: "sms",
    SHOP_SHIPPING_FEE: "3000",
    SHOP_FREE_SHIPPING_THRESHOLD: "50000",
    STOCK_RESERVATION_MINUTES: "30",
    PAYMENT_MODE: "test",
  },
}));
import * as notifications from "@/server/repository/notifications";
import { solapi, SolapiError } from "@/server/notifications";
import { atomic } from "@/server/repository/atomic";
import * as catalog from "@/server/repository/catalog";
import * as orders from "@/server/repository/orders";
import * as payments from "@/server/repository/payments";
import { toss, TossError } from "@/server/payments";

let testDirectory: string;
let client: Client;
let customer: { id: string; email: string };
let other: { id: string; email: string };
let skuId: string;
let productId: string;
const address = {
  name: "Test customer",
  phone: "01000000000",
  postalCode: "12345",
  address: "Test address",
  detail: "101",
  memo: "",
};
const page = { page: 1, limit: 20 };
const draft: ProductInput = {
  name: "Original tee",
  slug: "original-tee",
  categoryId: null,
  description: "",
  status: "active",
  images: [],
  skus: [
    {
      code: "TEE-M",
      options: [{ name: "size", value: "M" }],
      price: 10000,
      active: true,
    },
  ],
};
const input = (quantity = 1): CheckoutInput => ({
  items: [{ skuId, quantity }],
  address,
  requestKey: uuid(),
});
const stock = async () =>
  (
    await context
      .db!.select()
      .from(schema.skus)
      .where(eq(schema.skus.id, skuId))
  )[0];
async function orderPayment(id: string) {
  return (
    await context
      .db!.select()
      .from(schema.payments)
      .where(eq(schema.payments.orderId, id))
  )[0];
}
function remote(
  order: Awaited<ReturnType<typeof orders.create>>,
  key = `payment-${order.id}`,
): TossPayment {
  return {
    paymentKey: key,
    orderId: order.number,
    mId: "test-merchant",
    currency: "KRW",
    status: "DONE",
    totalAmount: order.total,
    balanceAmount: order.total,
    method: "카드",
    approvedAt: new Date().toISOString(),
    receipt: null,
    cancels: [],
  };
}
async function paid(quantity = 1) {
  const order = await orders.create(input(quantity), customer);
  const data = remote(order);
  vi.spyOn(toss, "confirm").mockResolvedValue(data);
  vi.spyOn(toss, "find").mockImplementation(async () => data);
  await payments.confirm(
    { orderId: order.number, paymentKey: data.paymentKey, amount: order.total },
    customer.id,
  );
  return { order, data };
}
function cancellationProvider(data: TossPayment, throwAfter = false) {
  return vi
    .spyOn(toss, "cancel")
    .mockImplementation(async (_key, amount, reason) => {
      data.balanceAmount -= amount;
      data.status = data.balanceAmount ? "PARTIAL_CANCELED" : "CANCELED";
      data.cancels!.push({
        transactionKey: uuid(),
        cancelReason: reason,
        cancelAmount: amount,
        cancelStatus: "DONE",
        canceledAt: new Date().toISOString(),
      });
      if (throwAfter) throw new TossError("NETWORK_UNKNOWN", true);
      return structuredClone(data);
    });
}
async function refundInput(
  orderId: string,
  quantity = 1,
): Promise<RefundInput> {
  const detail = await orders.findById(orderId);
  return {
    orderId,
    requestKey: uuid(),
    items: [{ orderItemId: detail.items[0].id, quantity }],
    refundShipping: false,
    restock: true,
    reason: "반품 입고 확인",
  };
}

beforeEach(async () => {
  context.notificationsEnabled = false;
  testDirectory = mkdtempSync(join(tmpdir(), "commerce-template-test-"));
  client = createClient({ url: `file:${join(testDirectory, "test.db")}` });
  const db = drizzle(client, { schema });
  context.db = db as unknown as Database;
  await migrate(db, { migrationsFolder: "migrations" });
  customer = { id: uuid(), email: "customer@example.test" };
  other = { id: uuid(), email: "other@example.test" };
  await db.insert(schema.appAuthUser).values(
    [customer, other].map((u) => ({
      ...u,
      name: "Test",
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
  );
  productId = await catalog.save(draft, "admin-test");
  skuId = (await catalog.findById(productId)).skus[0].id;
  await catalog.adjustStock(
    { skuId, quantity: 10, reason: "초기 입고", requestKey: uuid() },
    "admin-test",
  );
});
afterEach(() => {
  client.close();
  rmSync(testDirectory, { recursive: true, force: true });
});

describe("SKU and order consistency", () => {
  it("applies each stock request once and refuses a changed payload", async () => {
    const request = {
      skuId,
      quantity: 2,
      reason: "재입고",
      requestKey: uuid(),
    };
    await catalog.adjustStock(request, "admin-test");
    await catalog.adjustStock(request, "admin-test");
    expect((await stock()).onHand).toBe(12);
    await expect(
      catalog.adjustStock({ ...request, quantity: 3 }, "admin-test"),
    ).rejects.toThrow("요청키");
  });
  it("prevents two concurrent orders from reserving the last stock twice", async () => {
    await catalog.adjustStock(
      { skuId, quantity: -9, reason: "실사", requestKey: uuid() },
      "admin-test",
    );
    const results = await Promise.allSettled([
      orders.create(input(), customer),
      orders.create(input(), other),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect((await stock()).reserved).toBe(1);
    expect((await stock()).onHand).toBe(1);
    expect((await orders.findAll({ search: "", status: "" }, page)).total).toBe(
      1,
    );
  });
  it("rolls back the whole batch when a later statement violates a constraint", async () => {
    const before = (await stock()).onHand;
    await expect(
      atomic(async (tx, add) => {
        add(
          tx
            .update(schema.skus)
            .set({ onHand: 50 })
            .where(eq(schema.skus.id, skuId)),
        );
        add(
          tx.insert(schema.skus).values({
            id: uuid(),
            productId,
            code: "TEE-M",
            optionKey: "duplicate",
            price: 100,
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
        );
      }),
    ).rejects.toThrow();
    expect((await stock()).onHand).toBe(before);
  });
  it("returns one order for concurrent duplicate checkout requests", async () => {
    const request = input(2);
    const [first, second] = await Promise.all([
      orders.create(request, customer),
      orders.create(request, customer),
    ]);
    expect(first.id).toBe(second.id);
    expect((await stock()).reserved).toBe(2);
  });
  it("freezes order product, option and price snapshots", async () => {
    const request = input(2);
    const order = await orders.create(request, customer);
    await catalog.save(
      {
        ...draft,
        id: productId,
        name: "Renamed",
        skus: [{ ...draft.skus[0], id: skuId, price: 25000 }],
      },
      "admin-test",
    );
    const detail = await orders.findById(order.id, customer.id);
    expect(detail.items[0].productName).toBe("Original tee");
    expect(detail.items[0].unitPrice).toBe(10000);
    expect(detail.total).toBe(23000);
    expect((await orders.create(request, customer)).id).toBe(order.id);
    await expect(
      orders.create({ ...request, items: [{ skuId, quantity: 3 }] }, customer),
    ).rejects.toThrow("요청키");
  });
  it("releases cancelled reservations once and protects reserved stock from adjustments", async () => {
    const order = await orders.create(input(4), customer);
    await expect(
      catalog.adjustStock(
        { skuId, quantity: -8, reason: "실사", requestKey: uuid() },
        "admin-test",
      ),
    ).rejects.toThrow("예약");
    await orders.cancelUnpaid(order.id, customer.id, customer.id);
    await orders.cancelUnpaid(order.id, customer.id, customer.id);
    expect((await stock()).reserved).toBe(0);
    expect((await stock()).onHand).toBe(10);
  });
  it("rejects another customer's order and a tampered payment amount before contacting Toss", async () => {
    const order = await orders.create(input(), customer);
    const confirm = vi.spyOn(toss, "confirm");
    await expect(orders.findById(order.id, other.id)).rejects.toThrow(
      "주문을 찾을",
    );
    await expect(
      payments.confirm(
        { orderId: order.number, paymentKey: "key", amount: order.total },
        other.id,
      ),
    ).rejects.toThrow("주문을 찾을");
    await expect(
      payments.confirm(
        { orderId: order.number, paymentKey: "key", amount: 1 },
        customer.id,
      ),
    ).rejects.toThrow("금액");
    expect(confirm).not.toHaveBeenCalled();
  });
  it("expires unpaid orders and rejects late confirmations", async () => {
    const order = await orders.create(input(), customer);
    await context
      .db!.update(schema.orders)
      .set({ expiresAt: new Date(0) })
      .where(eq(schema.orders.id, order.id));
    expect(await orders.expirePending()).toBe(1);
    expect((await stock()).reserved).toBe(0);
    await expect(
      payments.confirm(
        { orderId: order.number, paymentKey: "late", amount: order.total },
        customer.id,
      ),
    ).rejects.toThrow("취소·만료");
  });
});

describe("payment reconciliation and refunds", () => {
  it("consumes stock only once across duplicate approval and webhook delivery", async () => {
    const { order, data } = await paid(2);
    await payments.confirm(
      {
        orderId: order.number,
        paymentKey: data.paymentKey,
        amount: order.total,
      },
      customer.id,
    );
    await payments.queueWebhook("event-1", data.paymentKey);
    await payments.receiveWebhook("event-1", data.paymentKey);
    await payments.receiveWebhook("event-1", data.paymentKey);
    expect((await stock()).onHand).toBe(8);
    expect((await stock()).reserved).toBe(0);
    expect(
      await context
        .db!.select()
        .from(schema.inventoryMovements)
        .where(eq(schema.inventoryMovements.kind, "sale")),
    ).toHaveLength(1);
  });
  it("recovers a lost approval response by querying the payment", async () => {
    const order = await orders.create(input(), customer);
    const data = remote(order);
    vi.spyOn(toss, "confirm").mockRejectedValue(
      new TossError("NETWORK_UNKNOWN", true),
    );
    vi.spyOn(toss, "find").mockResolvedValue(data);
    await payments.confirm(
      {
        orderId: order.number,
        paymentKey: data.paymentKey,
        amount: order.total,
      },
      customer.id,
    );
    expect((await stock()).onHand).toBe(9);
    expect((await orderPayment(order.id)).status).toBe("done");
  });
  it("keeps reservations during uncertain payment and recovers without overselling", async () => {
    const order = await orders.create(input(2), customer);
    const data = remote(order);
    vi.spyOn(toss, "confirm").mockRejectedValue(
      new TossError("NETWORK_UNKNOWN", true),
    );
    const find = vi
      .spyOn(toss, "find")
      .mockRejectedValue(new TossError("NETWORK_UNKNOWN", true));
    await expect(
      payments.confirm(
        {
          orderId: order.number,
          paymentKey: data.paymentKey,
          amount: order.total,
        },
        customer.id,
      ),
    ).rejects.toThrow();
    await context
      .db!.update(schema.orders)
      .set({ expiresAt: new Date(0) })
      .where(eq(schema.orders.id, order.id));
    expect(await orders.expirePending()).toBe(0);
    expect((await stock()).reserved).toBe(2);
    find.mockResolvedValue(data);
    await payments.reconcile((await orderPayment(order.id)).id);
    expect((await stock()).onHand).toBe(8);
    expect((await stock()).reserved).toBe(0);
  });
  it("retries a timed-out partial refund without a second cancellation or stock return", async () => {
    const { order, data } = await paid(2);
    const cancel = cancellationProvider(data, true);
    const request = await refundInput(order.id);
    await expect(
      payments.requestRefund(request, "admin-test"),
    ).rejects.toThrow();
    const pending = await orderPayment(order.id);
    expect(pending.pendingRefundId).toBeTruthy();
    await payments.retryRefund(pending.pendingRefundId!);
    await payments.requestRefund(request, "admin-test");
    expect(cancel).toHaveBeenCalledTimes(1);
    expect((await stock()).onHand).toBe(9);
    expect((await orderPayment(order.id)).refundedAmount).toBe(10000);
    expect((await orders.findById(order.id)).items[0].refundedQuantity).toBe(1);
  });
  it("validates quantities and prevents duplicate shipping-fee refunds", async () => {
    const { order, data } = await paid(2);
    cancellationProvider(data);
    await expect(
      payments.requestRefund(await refundInput(order.id, 3), "admin-test"),
    ).rejects.toThrow("수량");
    const request = await refundInput(order.id);
    await payments.requestRefund(
      { ...request, refundShipping: true, restock: false },
      "admin-test",
    );
    expect((await stock()).onHand).toBe(8);
    await expect(
      payments.requestRefund(
        { ...request, requestKey: uuid(), refundShipping: true },
        "admin-test",
      ),
    ).rejects.toThrow("배송비");
  });
  it("refuses to ship when only an unrefunded shipping fee remains", async () => {
    const { order, data } = await paid(2);
    cancellationProvider(data);
    await payments.requestRefund(await refundInput(order.id, 2), "admin-test");
    expect((await orderPayment(order.id)).refundedAmount).toBe(20000);
    await expect(
      orders.ship(
        { orderId: order.id, carrier: "택배", trackingNumber: "123456" },
        "admin-test",
      ),
    ).rejects.toThrow("모든 상품");
  });
  it("keeps stocked or previously ordered SKUs available for inventory history", async () => {
    const replacement: ProductInput = {
      ...draft,
      id: productId,
      skus: [
        {
          code: "TEE-L",
          options: [{ name: "size", value: "L" }],
          price: 10000,
          active: true,
        },
      ],
    };
    await expect(catalog.save(replacement, "admin-test")).rejects.toThrow(
      "재고가 남은",
    );
    await paid(10);
    await expect(catalog.save(replacement, "admin-test")).rejects.toThrow(
      "주문 이력",
    );
    await catalog.save(
      {
        ...draft,
        id: productId,
        skus: [{ ...draft.skus[0], id: skuId, active: false }],
      },
      "admin-test",
    );
    expect((await stock()).deletedAt).toBeNull();
    expect((await stock()).active).toBe(false);
  });
  it("does not roll back a newer refund when an old approval response arrives", async () => {
    const { order, data } = await paid(2);
    const old = structuredClone(data);
    cancellationProvider(data);
    await payments.requestRefund(await refundInput(order.id), "admin-test");
    await payments.applyProvider((await orderPayment(order.id)).id, old);
    expect((await orderPayment(order.id)).status).toBe("partial_cancelled");
  });
  it("blocks fulfillment until paid and records shipment transitions", async () => {
    const unpaid = await orders.create(input(), customer);
    await expect(
      orders.ship(
        { orderId: unpaid.id, carrier: "택배", trackingNumber: "123456" },
        "admin-test",
      ),
    ).rejects.toThrow("결제");
    const { order } = await paid();
    await orders.ship(
      { orderId: order.id, carrier: "택배", trackingNumber: "123456" },
      "admin-test",
    );
    await orders.deliver(order.id, "admin-test");
    expect((await orders.findById(order.id)).fulfillmentStatus).toBe(
      "delivered",
    );
  });
});

describe("SOLAPI notification outbox", () => {
  async function rows() {
    return context.db!.select().from(schema.notifications);
  }
  it("records skipped events without sending them after keys are configured", async () => {
    await paid();
    expect((await rows())[0].status).toBe("skipped");
    context.notificationsEnabled = true;
    const send = vi.spyOn(solapi, "send");
    await notifications.processPending();
    expect(send).not.toHaveBeenCalled();
    expect((await rows())[0].status).toBe("skipped");
  });
  it("creates one outbox event and claims concurrent workers only once", async () => {
    context.notificationsEnabled = true;
    const { order, data } = await paid();
    await payments.applyProvider((await orderPayment(order.id)).id, data);
    expect(await rows()).toHaveLength(1);
    const send = vi.spyOn(solapi, "send").mockResolvedValue("message-one");
    const n = (await rows())[0];
    await Promise.all([
      notifications.dispatch(n.id),
      notifications.dispatch(n.id),
    ]);
    expect(send).toHaveBeenCalledTimes(1);
    expect((await rows())[0]).toMatchObject({
      status: "submitted",
      attempts: 1,
      messageId: "message-one",
    });
    const submitted = (await rows())[0];
    vi.spyOn(solapi, "find").mockResolvedValue({
      messageId: "message-one",
      to: address.phone,
      status: "COMPLETE",
      statusCode: "4000",
      customFields: { notificationAttempt: submitted.attemptKey! },
    });
    await notifications.reconcile(n.id);
    expect((await rows())[0].status).toBe("delivered");
  });
  it("never blindly resends after a lost response, and can recover the delivery", async () => {
    context.notificationsEnabled = true;
    await paid();
    const send = vi
      .spyOn(solapi, "send")
      .mockRejectedValue(new SolapiError("RESPONSE_UNKNOWN", true));
    const n = (await rows())[0];
    await notifications.dispatch(n.id);
    expect((await rows())[0].status).toBe("unknown");
    const find = vi.spyOn(solapi, "find").mockResolvedValue(null);
    await notifications.reconcile(n.id);
    await notifications.dispatch(n.id);
    await expect(notifications.retry(n.id, "admin-test")).rejects.toThrow(
      "실패가 확정된",
    );
    expect(send).toHaveBeenCalledTimes(1);
    find.mockResolvedValue({
      messageId: "recovered",
      to: address.phone,
      status: "COMPLETE",
      statusCode: "4000",
      customFields: {},
    });
    await notifications.reconcile(n.id);
    expect((await rows())[0]).toMatchObject({
      status: "delivered",
      messageId: "recovered",
    });
  });
  it("uses a new attempt marker for explicit retries after a definitive rejection", async () => {
    context.notificationsEnabled = true;
    await paid();
    const send = vi
      .spyOn(solapi, "send")
      .mockRejectedValueOnce(new SolapiError("REJECTED_3040", false))
      .mockResolvedValue("retry-message");
    const n = (await rows())[0];
    await notifications.dispatch(n.id);
    const oldAttempt = (await rows())[0].attemptKey;
    await notifications.retry(n.id, "admin-test");
    expect((await rows())[0]).toMatchObject({
      status: "submitted",
      attempts: 2,
    });
    expect((await rows())[0].attemptKey).not.toBe(oldAttempt);
    expect(send).toHaveBeenCalledTimes(2);
  });
  it("rolls back an outbox event with a failed business batch", async () => {
    const order = await orders.create(input(), customer);
    await expect(
      atomic(async (db, add) => {
        notifications.enqueue(db, add, "paid", order);
        add(
          db
            .update(schema.skus)
            .set({ onHand: -1 })
            .where(eq(schema.skus.id, skuId)),
        );
      }),
    ).rejects.toThrow();
    expect(await rows()).toHaveLength(0);
  });
  it("records shipping, delivery and cumulative refunds once", async () => {
    const { order, data } = await paid(2);
    await orders.ship(
      { orderId: order.id, carrier: "택배", trackingNumber: "123456" },
      "admin-test",
    );
    await orders.deliver(order.id, "admin-test");
    cancellationProvider(data);
    const request = await refundInput(order.id);
    await payments.requestRefund(request, "admin-test");
    await payments.applyProvider((await orderPayment(order.id)).id, data);
    const all = await rows();
    expect(all.map((n) => n.event).sort()).toEqual([
      "delivered",
      "paid",
      "refunded",
      "shipped",
    ]);
    expect(
      JSON.parse(all.find((n) => n.event === "shipped")!.message).text,
    ).toContain("택배 123456");
    expect(
      JSON.parse(all.find((n) => n.event === "refunded")!.message).text,
    ).toContain("누적 10,000원");
  });
});
