import "server-only";
import { and, count, desc, eq, inArray, isNull, like, lte } from "drizzle-orm";
import { getDb, type Database } from "@/server/db";
import { notifications, orders } from "@/server/db/schema";
import {
  makeNotification,
  messageSchema,
  notificationConfiguration,
  solapi,
  SolapiError,
  type NotificationEvent,
} from "@/server/notifications";
import type { ListFilter } from "@/lib/commerce";
import { atomic, type AddStatement } from "./atomic";
import {
  audit,
  ensure,
  offset,
  paginate,
  stamp,
  updated,
} from "./commerce-support";
import { uuid } from "./id";
import type { PageRequest } from "./types";

type Notification = typeof notifications.$inferSelect;
/** Stage the outbox row in the same atomic batch as the business event. */
export function enqueue(
  db: Database,
  add: AddStatement,
  event: NotificationEvent,
  order: typeof orders.$inferSelect,
  extra: {
    carrier?: string;
    trackingNumber?: string;
    refundedAmount?: number;
  } = {},
) {
  const prepared = makeNotification(event, order, extra);
  const eventKey = `${event}:${order.id}${event === "refunded" ? `:${extra.refundedAmount}` : ""}`;
  add(
    db
      .insert(notifications)
      .values({
        id: uuid(),
        eventKey,
        orderId: order.id,
        event,
        channel: prepared.channel,
        recipient: prepared.recipient,
        message: JSON.stringify(prepared.message),
        status: prepared.ready ? "pending" : "skipped",
        lastError: prepared.ready ? null : prepared.reason,
        nextCheckAt: new Date(),
        ...stamp(),
      })
      .onConflictDoNothing({ target: notifications.eventKey }),
  );
}
export async function findAll(filter: ListFilter, pageable: PageRequest) {
  const db = await getDb();
  const where = and(
    isNull(notifications.deletedAt),
    filter.status
      ? eq(notifications.status, filter.status as Notification["status"])
      : undefined,
    filter.search ? like(orders.number, `%${filter.search}%`) : undefined,
  );
  const rows = await db
    .select({ notification: notifications, orderNumber: orders.number })
    .from(notifications)
    .innerJoin(orders, eq(orders.id, notifications.orderId))
    .where(where)
    .orderBy(desc(notifications.createdAt), desc(notifications.id))
    .limit(pageable.limit)
    .offset(offset(pageable));
  const [total] = await db
    .select({ value: count() })
    .from(notifications)
    .innerJoin(orders, eq(orders.id, notifications.orderId))
    .where(where);
  return paginate(rows, total.value, pageable);
}
async function find(id: string) {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(notifications)
    .where(and(eq(notifications.id, id), isNull(notifications.deletedAt)));
  ensure(row, "알림을 찾을 수 없습니다.");
  return row;
}
async function settle(
  row: Notification,
  status: Notification["status"],
  messageId: string | null,
  lastError: string | null,
) {
  await atomic(async (db, add) => {
    const [current] = await db
      .select()
      .from(notifications)
      .where(eq(notifications.id, row.id));
    if (
      current.attemptKey !== row.attemptKey ||
      ["delivered", "failed", "skipped"].includes(current.status)
    )
      return;
    add(
      db
        .update(notifications)
        .set({
          status,
          messageId,
          lastError,
          nextCheckAt: new Date(
            Date.now() + (status === "unknown" ? 60 * 60_000 : 2 * 60_000),
          ),
          ...updated(),
        })
        .where(eq(notifications.id, row.id)),
    );
  });
}
export async function reconcile(id: string) {
  const row = await find(id);
  if (
    !["sending", "submitted", "unknown"].includes(row.status) ||
    !row.attemptKey ||
    !row.attemptedAt
  )
    return;
  if (row.status === "sending" && row.nextCheckAt > new Date()) return;
  try {
    const remote = await solapi.find({
      recipient: row.recipient,
      attemptKey: row.attemptKey,
      attemptedAt: row.attemptedAt,
      messageId: row.messageId,
    });
    if (!remote) {
      await settle(
        row,
        row.messageId ? "submitted" : "unknown",
        row.messageId,
        "RESULT_NOT_FOUND",
      );
      return;
    }
    const status =
      remote.statusCode === "4000"
        ? "delivered"
        : remote.status === "COMPLETE"
          ? "failed"
          : "submitted";
    await settle(
      row,
      status,
      remote.messageId,
      status === "failed"
        ? `DELIVERY_${/^\d{4}$/.test(remote.statusCode ?? "") ? remote.statusCode : "FAILED"}`
        : null,
    );
  } catch (error) {
    await settle(
      row,
      row.messageId ? "submitted" : "unknown",
      row.messageId,
      error instanceof SolapiError ? error.code : "LOOKUP_FAILED",
    );
  }
}
export async function dispatch(id: string) {
  const claimed = await atomic(async (db, add) => {
    const [row] = await db
      .select()
      .from(notifications)
      .where(eq(notifications.id, id));
    if (!row || row.status !== "pending") return null;
    // Disable acts as a kill switch; skipped historical messages are never auto-replayed.
    if (!notificationConfiguration(row.event).ready) {
      add(
        db
          .update(notifications)
          .set({ status: "skipped", lastError: "NOT_CONFIGURED", ...updated() })
          .where(eq(notifications.id, id)),
      );
      return null;
    }
    const attemptKey = uuid(),
      attemptedAt = new Date();
    const change = {
      status: "sending" as const,
      attemptKey,
      attemptedAt,
      nextCheckAt: new Date(Date.now() + 60_000),
      attempts: row.attempts + 1,
      lastError: null,
      ...updated(),
    };
    add(db.update(notifications).set(change).where(eq(notifications.id, id)));
    return { ...row, ...change };
  });
  if (!claimed) return;
  try {
    const messageId = await solapi.send(
      messageSchema.parse(JSON.parse(claimed.message)),
      claimed.attemptKey,
    );
    await settle(claimed, "submitted", messageId, null);
  } catch (error) {
    const known = error instanceof SolapiError;
    await settle(
      claimed,
      known && !error.ambiguous ? "failed" : "unknown",
      null,
      known ? error.code : "RESPONSE_UNKNOWN",
    );
  }
}
export async function retry(id: string, actorId: string) {
  await atomic(async (db, add) => {
    const [row] = await db
      .select()
      .from(notifications)
      .where(eq(notifications.id, id));
    ensure(
      row?.status === "failed",
      "실패가 확정된 알림만 다시 보낼 수 있습니다. 미확인 건은 발송 결과를 먼저 조회해주세요.",
    );
    ensure(row.attempts < 5, "재발송 횟수를 초과했습니다.");
    const setup = notificationConfiguration(row.event);
    ensure(
      setup.ready && setup.channel === row.channel,
      "기존 발송 채널의 SOLAPI 설정을 확인해주세요.",
    );
    const message = messageSchema.parse(JSON.parse(row.message));
    message.from = setup.sender;
    if (message.kakaoOptions && setup.pfId && setup.templateId) {
      message.kakaoOptions.pfId = setup.pfId;
      message.kakaoOptions.templateId = setup.templateId;
    }
    add(
      db
        .update(notifications)
        .set({
          status: "pending",
          message: JSON.stringify(message),
          messageId: null,
          attemptKey: null,
          attemptedAt: null,
          nextCheckAt: new Date(),
          lastError: null,
          ...updated(),
        })
        .where(eq(notifications.id, id)),
    );
    add(
      audit(db, actorId, "notification.retry", row.orderId, {
        notificationId: id,
      }),
    );
  });
  await dispatch(id);
}
export async function processPending() {
  const db = await getDb();
  const rows = await db
    .select()
    .from(notifications)
    .where(
      and(
        isNull(notifications.deletedAt),
        inArray(notifications.status, [
          "pending",
          "sending",
          "submitted",
          "unknown",
        ]),
        lte(notifications.nextCheckAt, new Date()),
      ),
    )
    .orderBy(notifications.nextCheckAt)
    .limit(10);
  let processed = 0,
    failed = 0;
  for (const row of rows) {
    try {
      if (row.status === "pending") await dispatch(row.id);
      else await reconcile(row.id);
      processed++;
    } catch {
      failed++;
    }
  }
  return { processed, failed };
}
