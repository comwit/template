import "server-only";
import { z } from "zod";
import { config } from "@/server/config";
import type { Database } from "@/server/db";
import { auditLogs } from "@/server/db/schema";
import { uuid } from "./id";
import type { PageRequest, Pageable } from "./types";

export type Executor = Database;
export class CourseError extends Error {
  constructor(
    message: string,
    public readonly code = "INVALID_OPERATION",
  ) {
    super(message);
    this.name = "CourseError";
  }
}
export function ensure(
  condition: unknown,
  message: string,
  code?: string,
): asserts condition {
  if (!condition) throw new CourseError(message, code);
}
export const stamp = () => {
  const now = new Date();
  return { createdAt: now, updatedAt: now, deletedAt: null };
};
export const updated = () => ({ updatedAt: new Date() });
export const paginate = <T>(
  items: T[],
  total: number,
  pageable: PageRequest,
): Pageable<T> => ({
  items,
  total,
  ...pageable,
  totalPages: Math.ceil(total / pageable.limit),
});
export const offset = (page: PageRequest) => (page.page - 1) * page.limit;
/** 폼의 datetime-local 값처럼 시간대가 없는 문자열은 KST(+09:00)로 읽는다. */
export const toDate = (value: string | null | undefined) => {
  if (!value) return null;
  const bare = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/.test(value);
  return new Date(bare ? `${value}+09:00` : value);
};
export function audit(
  db: Executor,
  actorId: string,
  action: string,
  entityId: string,
  detail: Record<string, unknown> = {},
) {
  return db.insert(auditLogs).values({
    id: uuid(),
    actorId,
    action,
    entityId,
    detail: JSON.stringify(detail),
    ...stamp(),
  });
}
export function platformSettings() {
  const parsed = z
    .object({
      orderExpiryMinutes: z.coerce.number().int().min(5).max(120),
      refundWindowDays: z.coerce.number().int().min(0).max(365),
      refundProgressLimit: z.coerce.number().int().min(0).max(100),
      mode: z.enum(["test", "live"]),
    })
    .safeParse({
      orderExpiryMinutes: config.ORDER_EXPIRY_MINUTES,
      refundWindowDays: config.REFUND_WINDOW_DAYS,
      refundProgressLimit: config.REFUND_PROGRESS_LIMIT,
      mode: config.PAYMENT_MODE,
    });
  ensure(parsed.success, "플랫폼 환경설정을 확인해주세요.", "CONFIGURATION");
  return { ...parsed.data, name: config.PLATFORM_NAME };
}
