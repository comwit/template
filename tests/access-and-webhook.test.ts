import { beforeEach, describe, expect, it, vi } from "vitest";
const stubs = vi.hoisted(() => ({
  admin: vi.fn(),
  customer: vi.fn(),
  find: vi.fn(),
  queue: vi.fn(),
  reconcile: vi.fn(),
  expire: vi.fn(),
  after: vi.fn(),
  receive: vi.fn(),
  notifications: vi.fn(),
}));
vi.mock("next/server", () => ({
  after: stubs.after,
  connection: async () => undefined,
}));
vi.mock("@/server/auth", () => ({
  requireAdmin: stubs.admin,
  requireCustomer: stubs.customer,
}));
vi.mock("@/server/repository", () => ({
  CommerceError: class CommerceError extends Error {},
  notificationRepository: {
    processPending: stubs.notifications,
    findAll: stubs.find,
  },
  catalogRepository: { findAll: stubs.find },
  orderRepository: { expirePending: stubs.expire },
  paymentRepository: {
    queueWebhook: stubs.queue,
    receiveWebhook: stubs.receive,
    reconcilePending: stubs.reconcile,
  },
}));
vi.mock("@/server/config", () => ({
  config: { COMMERCE_CRON_SECRET: "fixture-cron-secret" },
}));
import { findAll } from "@/services/admin/api/catalog/actions/find-all";
import {
  paymentWebhook,
  paymentFailure,
  commerceMaintenance,
} from "@/server/commerce/handlers";
import { ActionError } from "@/lib/utils";
beforeEach(() => {
  vi.clearAllMocks();
});
describe("authorization boundaries", () => {
  it("rejects anonymous admin API calls before reading the repository", async () => {
    stubs.admin.mockRejectedValue(
      new ActionError("관리자 로그인이 필요합니다."),
    );
    await expect(
      findAll({ search: "", status: "" }, { page: 1, limit: 20 }),
    ).rejects.toThrow("관리자 로그인");
    expect(stubs.find).not.toHaveBeenCalled();
  });
  it("rejects unauthenticated maintenance calls", async () => {
    expect(
      (
        await commerceMaintenance(
          new Request("https://shop.test/cron/expire-orders", {
            method: "POST",
          }),
        )
      ).status,
    ).toBe(401);
    expect(stubs.expire).not.toHaveBeenCalled();
  });
  it("runs only the requested maintenance job with its secret", async () => {
    stubs.expire.mockResolvedValue(2);
    const response = await commerceMaintenance(
      new Request("https://shop.test/cron/expire-orders", {
        method: "POST",
        headers: { "X-Comwit-Cron-Secret": "fixture-cron-secret" },
      }),
    );
    expect(await response.json()).toEqual({ expired: 2 });
    expect(stubs.reconcile).not.toHaveBeenCalled();
  });
});
describe("durable webhooks", () => {
  it("enqueues only a payment reference and ignores untrusted amount/status fields", async () => {
    stubs.queue.mockResolvedValue(undefined);
    const response = await paymentWebhook(
      new Request("https://shop.test/api/payments/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "tosspayments-webhook-transmission-id": "transmission-one",
        },
        body: JSON.stringify({
          eventType: "PAYMENT_STATUS_CHANGED",
          data: {
            paymentKey: "known-payment",
            orderId: "forged-order",
            totalAmount: 1,
            status: "DONE",
          },
        }),
      }),
    );
    expect(response.status).toBe(200);
    expect(stubs.queue).toHaveBeenCalledWith(
      expect.stringMatching(/^[a-f0-9]{64}$/),
      "known-payment",
    );
    expect(stubs.reconcile).not.toHaveBeenCalled();
    expect(stubs.after).toHaveBeenCalledOnce();
    await stubs.after.mock.calls[0][0]();
    expect(stubs.receive).toHaveBeenCalledWith(
      expect.any(String),
      "known-payment",
    );
  });
  it("returns retryable failure when durable storage fails", async () => {
    stubs.queue.mockRejectedValue(new Error("database unavailable"));
    const response = await paymentWebhook(
      new Request("https://shop.test/api/payments/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: "PAYMENT_STATUS_CHANGED",
          data: { paymentKey: "known-payment" },
        }),
      }),
    );
    expect(response.status).toBe(503);
  });
  it("bounds request size before JSON parsing", async () => {
    const response = await paymentWebhook(
      new Request("https://shop.test/api/payments/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "x".repeat(33000),
      }),
    );
    expect(response.status).toBe(413);
    expect(stubs.queue).not.toHaveBeenCalled();
  });
});

it("keeps failure redirects uncached and excludes provider query details", async () => {
  const response = await paymentFailure(
    new Request(
      "https://shop.test/api/payments/fail?paymentKey=fixture-private-key&message=provider-detail",
    ),
  );
  expect(response.status).toBe(303);
  expect(response.headers.get("Location")).toBe(
    "https://shop.test/checkout/result?payment=failed",
  );
  expect(response.headers.get("Cache-Control")).toBe("no-store");
});

it("protects notification administration and its independent maintenance route", async () => {
  const { findAll: findNotifications } =
    await import("@/services/admin/api/notifications/actions/find-all");
  stubs.admin.mockRejectedValue(new ActionError("관리자 로그인이 필요합니다."));
  await expect(
    findNotifications({ search: "", status: "" }, { page: 1, limit: 20 }),
  ).rejects.toThrow("관리자 로그인");
  expect(stubs.find).not.toHaveBeenCalled();
  const unauthorized = await commerceMaintenance(
    new Request("https://shop.test/cron/send-notifications", {
      method: "POST",
    }),
  );
  expect(unauthorized.status).toBe(401);
  expect(stubs.notifications).not.toHaveBeenCalled();
  stubs.notifications.mockResolvedValue({ processed: 0, failed: 0 });
  const response = await commerceMaintenance(
    new Request("https://shop.test/cron/send-notifications", {
      method: "POST",
      headers: { "X-Comwit-Cron-Secret": "fixture-cron-secret" },
    }),
  );
  expect(await response.json()).toEqual({ processed: 0, failed: 0 });
  expect(stubs.reconcile).not.toHaveBeenCalled();
});
