import "server-only";
import { after, connection } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { config } from "@/server/config";
import { requireCustomer } from "@/server/auth";
import {
  orderRepository,
  paymentRepository,
  CourseError,
} from "@/server/repository";
import { confirmSchema } from "@/lib/course";

function destination(request: Request, result: string, orderId?: string) {
  const url = new URL("/checkout/result", config.APP_URL ?? request.url);
  url.searchParams.set("payment", result);
  if (orderId) url.searchParams.set("order", orderId);
  return new Response(null, {
    status: 303,
    headers: {
      Location: url.toString(),
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}
/** 토스 위젯 successUrl. 서버가 승인을 확정하고 결과 화면으로 보낸다. */
export async function paymentSuccess(request: Request) {
  try {
    const user = await requireCustomer();
    const params = new URL(request.url).searchParams;
    const input = confirmSchema.parse({
      orderId: params.get("orderId"),
      paymentKey: params.get("paymentKey"),
      amount: Number(params.get("amount")),
    });
    const orderId = await paymentRepository.confirm(input, user.id);
    return destination(request, "success", orderId);
  } catch {
    return destination(request, "review");
  }
}
export async function paymentFailure(request: Request) {
  // APP_URL differs between local builds and hosted runtime; never prerender this redirect.
  await connection();
  // A failed browser redirect is not proof of a failed debit. Leave authoritative state alone.
  return destination(request, "failed");
}
export async function paymentWebhook(request: Request) {
  if (!request.headers.get("content-type")?.includes("application/json"))
    return new Response(null, { status: 415 });
  const maxBytes = 32 * 1024;
  if (Number(request.headers.get("content-length")) > maxBytes)
    return new Response(null, { status: 413 });
  try {
    if (!request.body) return new Response(null, { status: 400 });
    const reader = request.body.getReader();
    const chunks: Uint8Array[] = [];
    let length = 0;
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      length += result.value.length;
      if (length > maxBytes) {
        await reader.cancel();
        return new Response(null, { status: 413 });
      }
      chunks.push(result.value);
    }
    const data = z
      .object({
        eventType: z.enum(["PAYMENT_STATUS_CHANGED", "CANCEL_STATUS_CHANGED"]),
        data: z.object({ paymentKey: z.string().min(1).max(200) }),
      })
      .parse(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    const transmission = request.headers.get(
      "tosspayments-webhook-transmission-id",
    );
    const eventKey = createHash("sha256")
      .update(
        transmission
          ? `${data.data.paymentKey}:${transmission.slice(0, 200)}`
          : Buffer.concat(chunks),
      )
      .digest("hex");
    // Durable enqueue before 200. A worker verifies the payment against Toss using server credentials.
    await paymentRepository.queueWebhook(eventKey, data.data.paymentKey);
    after(async () => {
      try {
        await paymentRepository.receiveWebhook(eventKey, data.data.paymentKey);
      } catch {
        /* The durable event remains retryable by scheduled/admin reconciliation. */
      }
    });
    return Response.json(
      { received: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError)
      return new Response(null, { status: 400 });
    if (error instanceof CourseError && error.code === "NOT_FOUND")
      return Response.json({ received: true });
    return new Response(null, {
      status: 503,
      headers: { "Retry-After": "30" },
    });
  }
}
/** `/cron/expire-orders`, `/cron/reconcile-payments` — X-Comwit-Cron-Secret 로 보호되는 유지보수 경로 */
export async function courseMaintenance(request: Request) {
  const expected = config.COURSE_CRON_SECRET;
  const value = request.headers.get("X-Comwit-Cron-Secret") ?? "";
  if (
    !expected ||
    value.length > 256 ||
    Buffer.byteLength(expected) !== Buffer.byteLength(value) ||
    !timingSafeEqual(Buffer.from(expected), Buffer.from(value))
  )
    return new Response(null, { status: 401 });
  const url = new URL(request.url);
  if (url.pathname.endsWith("/expire-orders"))
    return Response.json({ expired: await orderRepository.expirePending() });
  return Response.json(await paymentRepository.reconcilePending());
}
