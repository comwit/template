import "server-only";
import { z } from "zod";
import { config } from "@/server/config";
import type { PaymentMode } from "@/lib/course";

const paymentSchema = z.object({
  paymentKey: z.string(),
  orderId: z.string(),
  mId: z.string(),
  currency: z.literal("KRW"),
  status: z.enum([
    "READY",
    "IN_PROGRESS",
    "WAITING_FOR_DEPOSIT",
    "DONE",
    "CANCELED",
    "PARTIAL_CANCELED",
    "ABORTED",
    "EXPIRED",
  ]),
  totalAmount: z.number().int().positive(),
  balanceAmount: z.number().int().nonnegative(),
  method: z.string().nullable().optional(),
  approvedAt: z.string().nullable().optional(),
  receipt: z
    .object({
      url: z
        .string()
        .url()
        .refine((value) => value.startsWith("https://")),
    })
    .nullable()
    .optional(),
  cancels: z
    .array(
      z.object({
        transactionKey: z.string(),
        cancelReason: z.string(),
        cancelAmount: z.number().int().positive(),
        cancelStatus: z.string(),
        canceledAt: z.string(),
      }),
    )
    .nullable()
    .optional(),
});
export type TossPayment = z.infer<typeof paymentSchema>;
export class TossError extends Error {
  constructor(
    public readonly code: string,
    public readonly uncertain: boolean,
  ) {
    super(`결제 처리 확인이 필요합니다 (${code}).`);
    this.name = "TossError";
  }
}
export function getPaymentConfiguration(): {
  mode: PaymentMode;
  clientKey: string;
  mid: string;
  appUrl: string;
} {
  const mode = config.PAYMENT_MODE;
  if (mode !== "test" && mode !== "live")
    throw new TossError("INVALID_MODE", false);
  if (!config.TOSS_CLIENT_KEY || !config.TOSS_SECRET_KEY || !config.TOSS_MID)
    throw new TossError("PAYMENT_NOT_CONFIGURED", false);
  if (
    !config.TOSS_CLIENT_KEY.startsWith(`${mode}_`) ||
    !config.TOSS_SECRET_KEY.startsWith(`${mode}_`)
  )
    throw new TossError("KEY_MODE_MISMATCH", false);
  if (
    !config.APP_URL ||
    (mode === "live" && !config.APP_URL.startsWith("https://"))
  )
    throw new TossError("INVALID_APP_URL", false);
  return {
    mode,
    clientKey: config.TOSS_CLIENT_KEY,
    mid: config.TOSS_MID,
    appUrl: config.APP_URL,
  };
}
async function request(
  path: string,
  method: "GET" | "POST",
  mode: PaymentMode,
  body?: unknown,
  idempotencyKey?: string,
): Promise<TossPayment> {
  const settings = getPaymentConfiguration();
  if (settings.mode !== mode) throw new TossError("ORDER_MODE_MISMATCH", false);
  let response: Response;
  try {
    response = await fetch(`https://api.tosspayments.com/v1/payments${path}`, {
      method,
      headers: {
        Authorization: `Basic ${Buffer.from(`${config.TOSS_SECRET_KEY}:`).toString("base64")}`,
        "Content-Type": "application/json",
        ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
      redirect: "error",
    });
  } catch {
    throw new TossError("NETWORK_UNKNOWN", true);
  }
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const code =
      typeof payload?.code === "string" &&
      /^[A-Z0-9_]{1,80}$/.test(payload.code)
        ? payload.code
        : "PROVIDER_ERROR";
    throw new TossError(
      code,
      response.status >= 500 ||
        response.status === 429 ||
        code === "ALREADY_PROCESSED_PAYMENT",
    );
  }
  const parsed = paymentSchema.safeParse(payload);
  if (
    !parsed.success ||
    parsed.data.mId !== settings.mid ||
    parsed.data.balanceAmount > parsed.data.totalAmount
  )
    throw new TossError("PROVIDER_RESPONSE_MISMATCH", true);
  return parsed.data;
}
export const toss = {
  confirm(
    input: { paymentKey: string; orderId: string; amount: number },
    mode: PaymentMode,
    key: string,
  ) {
    return request("/confirm", "POST", mode, input, key);
  },
  find(paymentKey: string, mode: PaymentMode) {
    return request(`/${encodeURIComponent(paymentKey)}`, "GET", mode);
  },
  cancel(
    paymentKey: string,
    amount: number,
    reason: string,
    mode: PaymentMode,
    key: string,
  ) {
    return request(
      `/${encodeURIComponent(paymentKey)}/cancel`,
      "POST",
      mode,
      { cancelReason: reason, cancelAmount: amount },
      key,
    );
  },
};
