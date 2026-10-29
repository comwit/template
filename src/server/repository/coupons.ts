import "server-only";
import { atomic, type AddStatement } from "./atomic";
import { and, count, desc, eq, isNull, like, or, sql } from "drizzle-orm";
import { getDb } from "@/server/db";
import { couponRedemptions, coupons, courses } from "@/server/db/schema";
import { couponDiscount, type CouponInput, type ListFilter } from "@/lib/course";
import {
  audit,
  CourseError,
  ensure,
  offset,
  paginate,
  stamp,
  toDate,
  updated,
  type Executor,
} from "./support";
import { uuid } from "./id";
import type { PageRequest } from "./types";

export type CouponRow = typeof coupons.$inferSelect & {
  courseTitle: string | null;
};

export async function findAll(filter: ListFilter, pageable: PageRequest) {
  const db = await getDb();
  const now = Date.now();
  const where = and(
    isNull(coupons.deletedAt),
    filter.status === "active"
      ? and(
          eq(coupons.active, true),
          or(isNull(coupons.endsAt), sql`${coupons.endsAt} > ${now}`),
        )
      : filter.status === "inactive"
        ? eq(coupons.active, false)
        : filter.status === "expired"
          ? sql`${coupons.endsAt} <= ${now}`
          : undefined,
    filter.search
      ? or(
          like(coupons.code, `%${filter.search.toUpperCase()}%`),
          like(coupons.name, `%${filter.search}%`),
        )
      : undefined,
  );
  const rows = await db
    .select({ coupon: coupons, courseTitle: courses.title })
    .from(coupons)
    .leftJoin(courses, eq(courses.id, coupons.courseId))
    .where(where)
    .orderBy(desc(coupons.createdAt), desc(coupons.id))
    .limit(pageable.limit)
    .offset(offset(pageable));
  const [total] = await db.select({ value: count() }).from(coupons).where(where);
  return paginate(
    rows.map((r) => ({ ...r.coupon, courseTitle: r.courseTitle })),
    total.value,
    pageable,
  );
}

export async function save(input: CouponInput, actorId: string) {
  const db = await getDb();
  return atomic(async (tx, add) => {
    const id = input.id ?? uuid();
    const [duplicate] = await tx
      .select({ id: coupons.id })
      .from(coupons)
      .where(eq(coupons.code, input.code));
    ensure(!duplicate || duplicate.id === id, "이미 사용 중인 쿠폰 코드입니다.");
    if (input.courseId) {
      const [course] = await tx
        .select({ id: courses.id })
        .from(courses)
        .where(and(eq(courses.id, input.courseId), isNull(courses.deletedAt)));
      ensure(course, "유효한 강의를 선택해주세요.");
    }
    const data = {
      code: input.code,
      name: input.name,
      type: input.type,
      value: input.value,
      minAmount: input.minAmount,
      maxDiscount: input.maxDiscount,
      courseId: input.courseId,
      startsAt: toDate(input.startsAt),
      endsAt: toDate(input.endsAt),
      usageLimit: input.usageLimit,
      perUserLimit: input.perUserLimit,
      active: input.active,
      ...updated(),
    };
    if (input.id) {
      const [existing] = await tx
        .select()
        .from(coupons)
        .where(and(eq(coupons.id, id), isNull(coupons.deletedAt)));
      ensure(existing, "쿠폰을 찾을 수 없습니다.");
      ensure(
        input.usageLimit === null || input.usageLimit >= existing.usedCount,
        "사용 한도는 이미 사용된 횟수보다 작을 수 없습니다.",
      );
      add(tx.update(coupons).set(data).where(eq(coupons.id, id)));
    } else add(tx.insert(coupons).values({ id, ...stamp(), ...data }));
    add(audit(tx, actorId, "coupon.saved", id));
    return id;
  });
}

export async function setActive(id: string, active: boolean, actorId: string) {
  const db = await getDb();
  await atomic(async (tx, add) => {
    const rows = await tx
      .select({ id: coupons.id })
      .from(coupons)
      .where(and(eq(coupons.id, id), isNull(coupons.deletedAt)));
    ensure(rows.length, "쿠폰을 찾을 수 없습니다.");
    add(tx.update(coupons).set({ active, ...updated() }).where(eq(coupons.id, id)));
    add(audit(tx, actorId, active ? "coupon.activated" : "coupon.deactivated", id));
  });
}

/**
 * 주문에 쓸 수 있는지 확인하고 할인액을 돌려준다. 쓸 수 없으면 CourseError.
 * (견적은 오류 메시지를 couponError 로 보여 주고, 주문 생성은 그대로 던진다.)
 */
export async function evaluate(
  tx: Executor,
  code: string,
  userId: string,
  courseId: string,
  amount: number,
  now = new Date(),
) {
  const [coupon] = await tx
    .select()
    .from(coupons)
    .where(and(eq(coupons.code, code), isNull(coupons.deletedAt)));
  ensure(coupon?.active, "사용할 수 없는 쿠폰입니다.", "COUPON_INVALID");
  ensure(!coupon.startsAt || coupon.startsAt <= now, "아직 사용 기간이 아닌 쿠폰입니다.", "COUPON_INVALID");
  ensure(!coupon.endsAt || coupon.endsAt > now, "사용 기간이 지난 쿠폰입니다.", "COUPON_INVALID");
  ensure(!coupon.courseId || coupon.courseId === courseId, "이 강의에는 쓸 수 없는 쿠폰입니다.", "COUPON_INVALID");
  ensure(amount >= coupon.minAmount, `${coupon.minAmount.toLocaleString("ko-KR")}원 이상 결제할 때 쓸 수 있는 쿠폰입니다.`, "COUPON_INVALID");
  ensure(
    coupon.usageLimit === null || coupon.usedCount < coupon.usageLimit,
    "쿠폰 사용 한도가 모두 소진됐습니다.",
    "COUPON_INVALID",
  );
  const [mine] = await tx
    .select({ value: count() })
    .from(couponRedemptions)
    .where(
      and(
        eq(couponRedemptions.couponId, coupon.id),
        eq(couponRedemptions.userId, userId),
        sql`${couponRedemptions.status} IN ('held', 'used')`,
      ),
    );
  ensure(mine.value < coupon.perUserLimit, "이미 사용한 쿠폰입니다.", "COUPON_INVALID");
  const discount = couponDiscount(coupon, amount);
  ensure(discount > 0, "할인되는 금액이 없습니다.", "COUPON_INVALID");
  return { coupon, discount };
}

/** 주문 생성 배치에 함께 넣는다. 한도는 보류 시점에 점유한다(쇼핑몰 재고 예약과 같은 패턴). */
export function hold(
  tx: Executor,
  add: AddStatement,
  coupon: typeof coupons.$inferSelect,
  userId: string,
  orderId: string,
  discount: number,
  status: "held" | "used" = "held",
) {
  add(
    tx.insert(couponRedemptions).values({
      id: uuid(),
      couponId: coupon.id,
      userId,
      orderId,
      discount,
      status,
      ...stamp(),
    }),
  );
  add(
    tx
      .update(coupons)
      .set({ usedCount: sql`${coupons.usedCount} + 1`, ...updated() })
      .where(eq(coupons.id, coupon.id)),
  );
}
export async function settle(
  tx: Executor,
  add: AddStatement,
  orderId: string,
  status: "used" | "released",
) {
  const [redemption] = await tx
    .select()
    .from(couponRedemptions)
    .where(eq(couponRedemptions.orderId, orderId));
  if (!redemption || redemption.status !== "held") return;
  add(
    tx
      .update(couponRedemptions)
      .set({ status, ...updated() })
      .where(eq(couponRedemptions.id, redemption.id)),
  );
  if (status === "released")
    add(
      tx
        .update(coupons)
        .set({ usedCount: sql`${coupons.usedCount} - 1`, ...updated() })
        .where(eq(coupons.id, redemption.couponId)),
    );
}
export { CourseError as CouponError };
