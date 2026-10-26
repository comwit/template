import { beforeEach, expect, it, vi } from "vitest";
const settings = vi.hoisted(() => ({
  PAYMENT_MODE: "test",
  TOSS_CLIENT_KEY: "test_ck_fixture",
  TOSS_SECRET_KEY: "test_sk_fixture_not_a_real_key",
  TOSS_MID: "fixture-merchant",
  APP_URL: "http://localhost:3000",
}));
vi.mock("@/server/config", () => ({ config: settings }));
import { getPaymentConfiguration, toss } from "@/server/payments";
const payment = {
  paymentKey: "fixture-payment",
  orderId: "fixture-order",
  mId: "fixture-merchant",
  currency: "KRW",
  status: "DONE",
  totalAmount: 10000,
  balanceAmount: 10000,
  method: "카드",
  cancels: [],
};
beforeEach(() => {
  settings.PAYMENT_MODE = "test";
  settings.TOSS_CLIENT_KEY = "test_ck_fixture";
  settings.TOSS_SECRET_KEY = "test_sk_fixture_not_a_real_key";
  settings.TOSS_MID = "fixture-merchant";
  settings.APP_URL = "http://localhost:3000";
  vi.stubGlobal("fetch", vi.fn());
});
it("fails closed when keys belong to different environments", () => {
  settings.TOSS_SECRET_KEY = "live_sk_fixture";
  expect(() => getPaymentConfiguration()).toThrow("KEY_MODE_MISMATCH");
});
it("requires HTTPS before live payments", () => {
  settings.PAYMENT_MODE = "live";
  settings.TOSS_CLIENT_KEY = "live_ck_fixture";
  settings.TOSS_SECRET_KEY = "live_sk_fixture";
  expect(() => getPaymentConfiguration()).toThrow("INVALID_APP_URL");
});
it("sends persisted idempotency keys and checks merchant identity", async () => {
  const fetch = vi.mocked(globalThis.fetch);
  fetch.mockResolvedValue(Response.json(payment));
  await toss.confirm(
    { paymentKey: payment.paymentKey, orderId: payment.orderId, amount: 10000 },
    "test",
    "stable-idempotency-key",
  );
  expect(fetch).toHaveBeenCalledWith(
    "https://api.tosspayments.com/v1/payments/confirm",
    expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({
        "Idempotency-Key": "stable-idempotency-key",
      }),
      redirect: "error",
      cache: "no-store",
    }),
  );
  fetch.mockResolvedValue(Response.json({ ...payment, mId: "other-merchant" }));
  await expect(toss.find(payment.paymentKey, "test")).rejects.toThrow(
    "PROVIDER_RESPONSE_MISMATCH",
  );
});
it("rejects unsafe receipts and impossible balances", async () => {
  vi.mocked(globalThis.fetch).mockResolvedValue(
    Response.json({ ...payment, receipt: { url: "javascript:alert(1)" } }),
  );
  await expect(toss.find(payment.paymentKey, "test")).rejects.toThrow(
    "PROVIDER_RESPONSE_MISMATCH",
  );
  vi.mocked(globalThis.fetch).mockResolvedValue(
    Response.json({ ...payment, balanceAmount: 20000 }),
  );
  await expect(toss.find(payment.paymentKey, "test")).rejects.toThrow(
    "PROVIDER_RESPONSE_MISMATCH",
  );
});
it("does not expose provider response messages", async () => {
  vi.mocked(globalThis.fetch).mockResolvedValue(
    Response.json(
      { code: "INVALID_REQUEST", message: "private provider details" },
      { status: 400 },
    ),
  );
  await expect(toss.find(payment.paymentKey, "test")).rejects.not.toThrow(
    "private provider details",
  );
});
