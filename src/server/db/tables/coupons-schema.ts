import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { id, timestamps } from "./shared-schema";
import { appAuthUser } from "../plugin/auth/app-schema";
import { courses } from "./catalog-schema";
import { products } from "./products-schema";

// ── 쿠폰 ─────────────────────────────────────────────────────────
export const coupons = sqliteTable(
  "coupons",
  {
    id: id(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    type: text("type", { enum: ["percent", "fixed"] }).notNull(),
    value: integer("value").notNull(),
    minAmount: integer("min_amount").notNull().default(0),
    maxDiscount: integer("max_discount"),
    /** courseId·productId 모두 null 이면 모든 상품·강의에 적용 */
    courseId: text("course_id").references(() => courses.id),
    productId: text("product_id").references(() => products.id),
    startsAt: integer("starts_at", { mode: "timestamp_ms" }),
    endsAt: integer("ends_at", { mode: "timestamp_ms" }),
    usageLimit: integer("usage_limit"),
    usedCount: integer("used_count").notNull().default(0),
    perUserLimit: integer("per_user_limit").notNull().default(1),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("coupons_code_uq").on(t.code),
    index("coupons_list_idx").on(t.deletedAt, t.active, t.createdAt),
    check("coupons_value_check", sql`${t.value} > 0`),
    check(
      "coupons_usage_check",
      sql`${t.usedCount} >= 0 AND (${t.usageLimit} IS NULL OR ${t.usedCount} <= ${t.usageLimit})`,
    ),
  ],
);

export const couponRedemptions = sqliteTable(
  "coupon_redemptions",
  {
    id: id(),
    couponId: text("coupon_id")
      .notNull()
      .references(() => coupons.id),
    userId: text("user_id")
      .notNull()
      .references(() => appAuthUser.id),
    orderId: text("order_id").notNull(),
    status: text("status", { enum: ["held", "used", "released"] })
      .notNull()
      .default("held"),
    discount: integer("discount").notNull(),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("coupon_redemptions_order_uq").on(t.orderId),
    index("coupon_redemptions_user_idx").on(t.couponId, t.userId, t.status),
  ],
);
