import "server-only";
import { createHmac, randomBytes } from "node:crypto";
import { z } from "zod";
import { config } from "@/server/config";

export type NotificationEvent =
  "paid" | "shipped" | "delivered" | "refunded" | "cancelled";
export type NotificationChannel = "sms" | "alimtalk";
export const eventLabels: Record<NotificationEvent, string> = {
  paid: "결제 완료",
  shipped: "배송 시작",
  delivered: "배송 완료",
  refunded: "환불 완료",
  cancelled: "주문 취소",
};
export function notificationConfiguration(event?: NotificationEvent) {
  const templates = {
    paid: config.SOLAPI_TEMPLATE_PAID,
    shipped: config.SOLAPI_TEMPLATE_SHIPPED,
    delivered: config.SOLAPI_TEMPLATE_DELIVERED,
    refunded: config.SOLAPI_TEMPLATE_REFUNDED,
    cancelled: config.SOLAPI_TEMPLATE_CANCELLED,
  };
  const channel: NotificationChannel =
    config.SOLAPI_CHANNEL === "alimtalk" ? "alimtalk" : "sms";
  const sender = config.SOLAPI_SENDER_NUMBER?.replace(/[ -]/g, "") ?? "";
  const ready = Boolean(
    config.SOLAPI_ENABLED &&
    config.SOLAPI_API_KEY &&
    config.SOLAPI_API_SECRET &&
    ["sms", "alimtalk"].includes(config.SOLAPI_CHANNEL) &&
    /^\d{8,11}$/.test(sender) &&
    (channel === "sms" ||
      (config.SOLAPI_KAKAO_PF_ID &&
        (event ? templates[event] : Object.values(templates).every(Boolean)))),
  );
  return {
    ready,
    channel,
    sender,
    pfId: config.SOLAPI_KAKAO_PF_ID,
    templateId: event ? templates[event] : undefined,
  };
}
export function normalizePhone(value: string) {
  const digits = value.replace(/[ -]/g, "").replace(/^\+82/, "0");
  return /^01[016789]\d{7,8}$/.test(digits) ? digits : null;
}
export const messageSchema = z.object({
  to: z.string(),
  from: z.string(),
  text: z.string().max(1000),
  country: z.literal("82"),
  kakaoOptions: z
    .object({
      pfId: z.string(),
      templateId: z.string(),
      disableSms: z.literal(true),
      variables: z.record(z.string(), z.string()),
    })
    .optional(),
});
export type NotificationMessage = z.infer<typeof messageSchema>;
export function makeNotification(
  event: NotificationEvent,
  order: { number: string; shippingAddress: string; total: number },
  extra: {
    carrier?: string;
    trackingNumber?: string;
    refundedAmount?: number;
  } = {},
) {
  const address = JSON.parse(order.shippingAddress) as { phone: string };
  const recipient = normalizePhone(address.phone);
  const setup = notificationConfiguration(event);
  const number = `ORD-${order.number.slice(-12)}`;
  const amount = `${(extra.refundedAmount ?? order.total).toLocaleString("ko-KR")}원`;
  const variables: Record<string, string> = {
    "#{상점명}": config.SHOP_NAME,
    "#{주문번호}": number,
  };
  let detail = "";
  if (event === "paid" || event === "refunded") {
    variables["#{금액}"] = amount;
    detail =
      event === "refunded"
        ? `누적 ${amount} 환불이 완료되었습니다.`
        : `${amount} 결제가 완료되었습니다.`;
  } else if (event === "shipped") {
    variables["#{택배사}"] = extra.carrier ?? "";
    variables["#{운송장번호}"] = extra.trackingNumber ?? "";
    detail = `${extra.carrier} ${extra.trackingNumber}`;
  }
  const message: NotificationMessage = {
    to: recipient ?? "",
    from: setup.sender,
    country: "82",
    text: `[${config.SHOP_NAME}] ${eventLabels[event]}\n주문 ${number}${detail ? `\n${detail}` : ""}`,
    ...(setup.channel === "alimtalk" && setup.pfId && setup.templateId
      ? {
          kakaoOptions: {
            pfId: setup.pfId,
            templateId: setup.templateId,
            variables,
            disableSms: true as const,
          },
        }
      : {}),
  };
  return {
    message,
    recipient: recipient ?? "",
    channel: setup.channel,
    ready: setup.ready && Boolean(recipient),
    reason: recipient ? "NOT_CONFIGURED" : "INVALID_PHONE",
  };
}
export class SolapiError extends Error {
  constructor(
    public readonly code: string,
    public readonly ambiguous: boolean,
  ) {
    super("알림 발송 상태를 확인해주세요.");
  }
}
async function request(path: string, body?: unknown): Promise<unknown> {
  const key = config.SOLAPI_API_KEY,
    secret = config.SOLAPI_API_SECRET;
  if (!key || !secret) throw new SolapiError("NOT_CONFIGURED", false);
  const date = new Date().toISOString(),
    salt = randomBytes(16).toString("hex");
  const signature = createHmac("sha256", secret)
    .update(date + salt)
    .digest("hex");
  try {
    const response = await fetch(`https://api.solapi.com${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        Authorization: `HMAC-SHA256 apiKey=${key}, date=${date}, salt=${salt}, signature=${signature}`,
        "Content-Type": "application/json",
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
      redirect: "error",
    });
    if (!response.ok)
      throw new SolapiError(
        `HTTP_${response.status}`,
        ![400, 401, 403, 404, 429].includes(response.status),
      );
    return await response.json();
  } catch (error) {
    if (error instanceof SolapiError) throw error;
    throw new SolapiError("RESPONSE_UNKNOWN", true);
  }
}
const remoteSchema = z.object({
  messageId: z.string().min(1),
  to: z.string(),
  status: z.string(),
  statusCode: z.string().nullable(),
  customFields: z.record(z.string(), z.string()),
});
export type RemoteNotification = z.infer<typeof remoteSchema>;
export const solapi = {
  async send(
    message: NotificationMessage,
    attemptKey: string,
  ): Promise<string> {
    const result = z
      .object({
        failedMessageList: z.array(z.object({ statusCode: z.string() })),
        messageList: z
          .array(
            z.object({ messageId: z.string().min(1), statusCode: z.string() }),
          )
          .optional(),
      })
      .safeParse(
        await request("/messages/v4/send-many/detail", {
          messages: [
            {
              ...messageSchema.parse(message),
              customFields: { notificationAttempt: attemptKey },
            },
          ],
          allowDuplicates: false,
          showMessageList: true,
        }),
      );
    if (!result.success) throw new SolapiError("RESPONSE_UNKNOWN", true);
    const accepted =
      result.data.messageList?.filter((m) => m.statusCode === "2000") ?? [];
    if (accepted.length === 1 && result.data.failedMessageList.length === 0)
      return accepted[0].messageId;
    if (result.data.failedMessageList.length === 1 && accepted.length === 0) {
      const code = result.data.failedMessageList[0].statusCode;
      throw new SolapiError(
        /^\d{4}$/.test(code) ? `REJECTED_${code}` : "REJECTED",
        false,
      );
    }
    throw new SolapiError("RESPONSE_UNKNOWN", true);
  },
  async find(input: {
    recipient: string;
    attemptKey: string;
    attemptedAt: Date;
    messageId: string | null;
  }): Promise<RemoteNotification | null> {
    const params = new URLSearchParams({ to: input.recipient, limit: "100" });
    if (input.messageId)
      params.set("messageIds", JSON.stringify([input.messageId]));
    else {
      params.set(
        "startDate",
        new Date(input.attemptedAt.getTime() - 60_000).toISOString(),
      );
      params.set(
        "endDate",
        new Date(input.attemptedAt.getTime() + 10 * 60_000).toISOString(),
      );
    }
    // A lost send response is reconciled by our attempt marker, never blindly resent.
    for (let page = 0; page < 5; page++) {
      const result = z
        .object({
          messageList: z.record(z.string(), remoteSchema),
          nextKey: z.string().nullish(),
        })
        .parse(await request(`/messages/v4/list?${params}`));
      const found = Object.values(result.messageList).filter(
        (m) =>
          m.to === input.recipient &&
          m.customFields.notificationAttempt === input.attemptKey &&
          (!input.messageId || m.messageId === input.messageId),
      );
      if (found.length > 1) throw new SolapiError("DUPLICATE_REVIEW", true);
      if (found.length === 1) return found[0];
      if (!result.nextKey) return null;
      params.set("startKey", result.nextKey);
    }
    return null;
  },
};
