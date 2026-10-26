import "server-only";
import { z } from "zod";
import { config } from "@/server/config";
import type { Database } from "@/server/db";
import { auditLogs } from "@/server/db/schema";
import { uuid } from "./id";
import type { PageRequest, Pageable } from "./types";

export type Executor =
  Database | Parameters<Parameters<Database["transaction"]>[0]>[0];
export class CommerceError extends Error {
  constructor(
    message: string,
    public readonly code = "INVALID_OPERATION",
  ) {
    super(message);
    this.name = "CommerceError";
  }
}
export function ensure(
  condition: unknown,
  message: string,
  code?: string,
): asserts condition {
  if (!condition) throw new CommerceError(message, code);
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
export function shopSettings() {
  const parsed = z
    .object({
      shippingFee: z.coerce.number().int().min(0).max(1_000_000),
      freeShippingThreshold: z.coerce.number().int().min(0).max(1_000_000_000),
      reservationMinutes: z.coerce.number().int().min(5).max(120),
      mode: z.enum(["test", "live"]),
    })
    .safeParse({
      shippingFee: config.SHOP_SHIPPING_FEE,
      freeShippingThreshold: config.SHOP_FREE_SHIPPING_THRESHOLD,
      reservationMinutes: config.STOCK_RESERVATION_MINUTES,
      mode: config.PAYMENT_MODE,
    });
  ensure(parsed.success, "쇼핑몰 환경설정을 확인해주세요.", "CONFIGURATION");
  return { ...parsed.data, name: config.SHOP_NAME };
}
