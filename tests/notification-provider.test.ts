import { createHmac } from "node:crypto";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import {
  makeNotification,
  notificationConfiguration,
  solapi,
  SolapiError,
} from "@/server/notifications";
const order = {
  number: "ORDER-123456789012",
  shippingAddress: JSON.stringify({ phone: "+82 10-1234-5678" }),
  total: 13000,
};
beforeEach(() => {
  vi.stubEnv("SOLAPI_ENABLED", "true");
  vi.stubEnv("SOLAPI_CHANNEL", "sms");
  vi.stubEnv("SOLAPI_API_KEY", "fixture-key");
  vi.stubEnv("SOLAPI_API_SECRET", "fixture-secret");
  vi.stubEnv("SOLAPI_SENDER_NUMBER", "02-1234-5678");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
it("signs the official endpoint and treats acceptance separately from delivery", async () => {
  const fetcher = vi.fn().mockResolvedValue(
    Response.json({
      failedMessageList: [],
      messageList: [{ messageId: "M1", statusCode: "2000" }],
    }),
  );
  vi.stubGlobal("fetch", fetcher);
  const prepared = makeNotification("paid", order);
  expect(prepared.ready).toBe(true);
  expect(prepared.recipient).toBe("01012345678");
  expect(await solapi.send(prepared.message, "attempt-1")).toBe("M1");
  const [url, init] = fetcher.mock.calls[0];
  expect(url).toBe("https://api.solapi.com/messages/v4/send-many/detail");
  expect(JSON.parse(init.body)).toMatchObject({
    allowDuplicates: false,
    showMessageList: true,
    messages: [
      {
        from: "0212345678",
        customFields: { notificationAttempt: "attempt-1" },
      },
    ],
  });
  const fields = Object.fromEntries(
    init.headers.Authorization.replace("HMAC-SHA256 ", "")
      .split(", ")
      .map((p: string) => p.split("=")),
  );
  expect(fields.signature).toBe(
    createHmac("sha256", "fixture-secret")
      .update(fields.date + fields.salt)
      .digest("hex"),
  );
  expect(init.redirect).toBe("error");
  expect(init.cache).toBe("no-store");
});
it("requires Alimtalk templates and uses approved variables without implicit fallback sends", () => {
  vi.stubEnv("SOLAPI_CHANNEL", "alimtalk");
  expect(notificationConfiguration("shipped").ready).toBe(false);
  vi.stubEnv("SOLAPI_KAKAO_PF_ID", "fixture-channel");
  vi.stubEnv("SOLAPI_TEMPLATE_SHIPPED", "fixture-template");
  const prepared = makeNotification("shipped", order, {
    carrier: "택배",
    trackingNumber: "123456",
  });
  expect(prepared.ready).toBe(true);
  expect(prepared.message.kakaoOptions).toMatchObject({
    pfId: "fixture-channel",
    templateId: "fixture-template",
    disableSms: true,
    variables: { "#{택배사}": "택배", "#{운송장번호}": "123456" },
  });
  expect(prepared.message.text).toContain("택배 123456");
});
it("does not reveal a provider error body or treat a timeout as a rejection", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValue(new Response("secret phone number", { status: 500 }));
  vi.stubGlobal("fetch", fetcher);
  await expect(
    solapi.send(makeNotification("paid", order).message, "attempt-1"),
  ).rejects.toMatchObject({
    code: "HTTP_500",
    ambiguous: true,
    message: "알림 발송 상태를 확인해주세요.",
  });
  fetcher.mockRejectedValueOnce(new Error("secret network detail"));
  await expect(
    solapi.send(makeNotification("paid", order).message, "attempt-1"),
  ).rejects.toMatchObject({ code: "RESPONSE_UNKNOWN", ambiguous: true });
  fetcher.mockResolvedValueOnce(
    Response.json({ failedMessageList: [{ statusCode: "3040" }] }),
  );
  await expect(
    solapi.send(makeNotification("paid", order).message, "attempt-1"),
  ).rejects.toMatchObject({ code: "REJECTED_3040", ambiguous: false });
});
it("looks up lost responses by recipient, time and attempt marker, ignoring unrelated messages", async () => {
  const remote = (attempt: string, id: string) => ({
    messageId: id,
    to: "01012345678",
    status: "COMPLETE",
    statusCode: "4000",
    customFields: { notificationAttempt: attempt },
  });
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(
      Response.json({
        messageList: { M0: remote("other", "M0") },
        nextKey: "next",
      }),
    )
    .mockResolvedValueOnce(
      Response.json({ messageList: { M1: remote("attempt-1", "M1") } }),
    );
  vi.stubGlobal("fetch", fetcher);
  const result = await solapi.find({
    recipient: "01012345678",
    attemptedAt: new Date(),
    attemptKey: "attempt-1",
    messageId: null,
  });
  expect(result?.messageId).toBe("M1");
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(new URL(fetcher.mock.calls[1][0]).searchParams.get("startKey")).toBe(
    "next",
  );
});
it("disables invalid recipient and missing configuration without pretending to send", () => {
  expect(
    makeNotification("paid", {
      ...order,
      shippingAddress: JSON.stringify({ phone: "abc" }),
    }).ready,
  ).toBe(false);
  vi.stubEnv("SOLAPI_API_SECRET", "");
  expect(notificationConfiguration().ready).toBe(false);
});
