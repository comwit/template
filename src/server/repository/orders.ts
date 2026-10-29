import "server-only";
import { atomic } from "./atomic";
import {
  and,
  count,
  desc,
  eq,
  inArray,
  isNull,
  like,
  lte,
  or,
} from "drizzle-orm";
import { getDb } from "@/server/db";
import {
  auditLogs,
  courses,
  enrollments,
  orders,
  payments,
  refundRequests,
  refunds,
} from "@/server/db/schema";
import {
  salePrice,
  type CheckoutInput,
  type ListFilter,
  type QuoteInput,
} from "@/lib/course";
import { enroll, findActive } from "./enrollments";
import * as coupons from "./coupons";
import {
  audit,
  CourseError,
  ensure,
  offset,
  paginate,
  platformSettings,
  stamp,
  updated,
} from "./support";
import { uuid } from "./id";
import type { PageRequest } from "./types";

export async function findAll(
  filter: ListFilter,
  pageable: PageRequest,
  customerId?: string,
) {
  const db = await getDb();
  const where = and(
    isNull(orders.deletedAt),
    customerId ? eq(orders.customerId, customerId) : undefined,
    filter.status
      ? eq(orders.status, filter.status as typeof orders.$inferSelect.status)
      : undefined,
    filter.search
      ? or(
          like(orders.number, `%${filter.search}%`),
          like(orders.customerEmail, `%${filter.search}%`),
          like(orders.courseTitle, `%${filter.search}%`),
        )
      : undefined,
  );
  const items = await db
    .select()
    .from(orders)
    .where(where)
    .orderBy(desc(orders.createdAt), desc(orders.id))
    .limit(pageable.limit)
    .offset(offset(pageable));
  const [total] = await db.select({ value: count() }).from(orders).where(where);
  return paginate(items, total.value, pageable);
}

export async function findById(id: string, customerId?: string) {
  const db = await getDb();
  const [order] = await db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.id, id),
        isNull(orders.deletedAt),
        customerId ? eq(orders.customerId, customerId) : undefined,
      ),
    );
  ensure(order, "주문을 찾을 수 없습니다.", "NOT_FOUND");
  const [paymentRows, refundRows, requestRows, enrollmentRows, history] =
    await Promise.all([
      db.select().from(payments).where(eq(payments.orderId, id)),
      db
        .select()
        .from(refunds)
        .where(eq(refunds.orderId, id))
        .orderBy(desc(refunds.createdAt)),
      db
        .select()
        .from(refundRequests)
        .where(eq(refundRequests.orderId, id))
        .orderBy(desc(refundRequests.createdAt))
        .limit(1),
      db
        .select({ id: enrollments.id, progressPercent: enrollments.progressPercent, status: enrollments.status })
        .from(enrollments)
        .where(eq(enrollments.orderId, id)),
      db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.entityId, id))
        .orderBy(desc(auditLogs.createdAt))
        .limit(100),
    ]);
  const settings = platformSettings();
  const payment = paymentRows[0] ?? null;
  const enrollment = enrollmentRows[0] ?? null;
  const withinWindow =
    payment?.approvedAt !== null &&
    payment?.approvedAt !== undefined &&
    Date.now() - payment.approvedAt.getTime() <=
      settings.refundWindowDays * 24 * 60 * 60_000;
  const canRequestRefund = Boolean(
    order.status === "confirmed" &&
      order.paymentStatus === "paid" &&
      payment?.status === "done" &&
      !payment.pendingRefundId &&
      withinWindow &&
      (enrollment?.progressPercent ?? 0) < settings.refundProgressLimit &&
      requestRows[0]?.status !== "pending",
  );
  return {
    ...order,
    payment,
    refunds: refundRows,
    refundRequest: requestRows[0] ?? null,
    enrollment,
    canRequestRefund,
    history,
  };
}

/** 결제 전 금액 미리보기. 쿠폰이 안 맞으면 오류 대신 couponError 로 알린다. */
export async function quote(input: QuoteInput, userId: string) {
  const db = await getDb();
  const [course] = await db
    .select()
    .from(courses)
    .where(
      and(
        eq(courses.id, input.courseId),
        isNull(courses.deletedAt),
        eq(courses.status, "published"),
      ),
    );
  ensure(course, "수강 신청할 수 없는 강의입니다.", "NOT_FOUND");
  const listPrice = course.price;
  const sale = salePrice(course);
  const discount = listPrice - sale;
  let couponDiscount = 0;
  let couponError: string | null = null;
  let couponCode: string | null = null;
  if (input.couponCode && sale > 0) {
    try {
      const result = await coupons.evaluate(
        db,
        input.couponCode,
        userId,
        course.id,
        sale,
      );
      couponDiscount = result.discount;
      couponCode = result.coupon.code;
    } catch (error) {
      couponError =
        error instanceof CourseError ? error.message : "쿠폰을 확인해주세요.";
    }
  } else if (input.couponCode) couponError = "무료 강의에는 쿠폰을 쓸 수 없습니다.";
  const enrollment = await findActive(course.id, userId);
  return {
    course,
    listPrice,
    discount,
    couponCode,
    couponDiscount,
    couponError,
    total: sale - couponDiscount,
    alreadyEnrolled: Boolean(enrollment),
  };
}

/**
 * 주문 생성. 유료는 pending 주문 + ready 결제를 만들고 토스 위젯이 이어서 결제한다.
 * 무료(총액 0)는 결제 없이 바로 confirmed 처리하고 같은 배치에서 수강을 연다.
 */
export async function create(
  input: CheckoutInput,
  customer: { id: string; email: string },
) {
  const db = await getDb();
  const settings = platformSettings();
  return atomic(async (tx, add) => {
    const [old] = await tx
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.customerId, customer.id),
          eq(orders.requestKey, input.requestKey),
        ),
      );
    if (old) {
      ensure(
        old.courseId === input.courseId &&
          (old.couponCode ?? null) === (input.couponCode ?? null),
        "다른 주문에 사용된 요청키입니다.",
      );
      return old;
    }
    const [course] = await tx
      .select()
      .from(courses)
      .where(
        and(
          eq(courses.id, input.courseId),
          isNull(courses.deletedAt),
          eq(courses.status, "published"),
        ),
      );
    ensure(course, "수강 신청할 수 없는 강의입니다.", "NOT_FOUND");
    const active = await findActive(course.id, customer.id);
    ensure(!active, "이미 수강 중인 강의입니다.", "ALREADY_ENROLLED");
    const [pendingOrder] = await tx
      .select({ id: orders.id })
      .from(orders)
      .where(
        and(
          eq(orders.customerId, customer.id),
          eq(orders.courseId, course.id),
          eq(orders.status, "pending"),
        ),
      );
    ensure(
      !pendingOrder,
      "결제 대기 중인 주문이 있습니다. 결제 내역에서 취소하거나 이어서 결제해주세요.",
      "PENDING_ORDER",
    );
    const listPrice = course.price;
    const sale = salePrice(course);
    let couponDiscount = 0;
    let coupon: Awaited<ReturnType<typeof coupons.evaluate>>["coupon"] | null =
      null;
    if (input.couponCode) {
      ensure(sale > 0, "무료 강의에는 쿠폰을 쓸 수 없습니다.");
      const result = await coupons.evaluate(tx, input.couponCode, customer.id, course.id, sale);
      coupon = result.coupon;
      couponDiscount = result.discount;
    }
    const total = sale - couponDiscount;
    ensure(
      Number.isSafeInteger(total) && total >= 0 && total <= 1_000_000_000,
      "결제 금액을 확인해주세요.",
    );
    const id = uuid();
    const free = total === 0;
    const order: typeof orders.$inferSelect = {
      id,
      number: `order-${id}`,
      customerId: customer.id,
      customerEmail: customer.email,
      requestKey: input.requestKey,
      courseId: course.id,
      courseTitle: course.title,
      status: free ? "confirmed" : "pending",
      paymentStatus: free ? "free" : "unpaid",
      listPrice,
      discount: listPrice - sale,
      couponId: coupon?.id ?? null,
      couponCode: coupon?.code ?? null,
      couponDiscount,
      total,
      expiresAt: new Date(Date.now() + settings.orderExpiryMinutes * 60_000),
      ...stamp(),
    };
    add(tx.insert(orders).values(order));
    // 무료 확정 주문은 결제 승인 단계가 없으므로 쿠폰을 바로 사용 처리한다.
    if (coupon)
      coupons.hold(
        tx,
        add,
        coupon,
        customer.id,
        id,
        couponDiscount,
        free ? "used" : "held",
      );
    if (free) {
      const enrollmentId = await enroll(tx, add, {
        courseId: course.id,
        userId: customer.id,
        source: "free",
        orderId: id,
      });
      add(audit(tx, customer.id, "order.created", id, { free: true }));
      add(audit(tx, customer.id, "enrollment.opened", enrollmentId, { orderId: id }));
      return order;
    }
    add(
      tx.insert(payments).values({
        id: uuid(),
        orderId: id,
        providerOrderId: order.number,
        amount: total,
        idempotencyKey: uuid(),
        mode: settings.mode,
        ...stamp(),
      }),
    );
    add(audit(tx, customer.id, "order.created", id));
    return order;
  });
}

export async function cancelUnpaid(
  id: string,
  actorId: string,
  customerId?: string,
) {
  const db = await getDb();
  await atomic(async (tx, add) => {
    const [order] = await tx
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.id, id),
          customerId ? eq(orders.customerId, customerId) : undefined,
        ),
      );
    ensure(order, "주문을 찾을 수 없습니다.");
    if (order.status === "cancelled" || order.status === "expired") return;
    const [payment] = await tx
      .select()
      .from(payments)
      .where(eq(payments.orderId, id));
    ensure(
      order.status === "pending" &&
        payment &&
        ["ready", "failed"].includes(payment.status),
      "승인 중이거나 결제된 주문은 결제 확인 또는 환불 처리가 필요합니다.",
    );
    await coupons.settle(tx, add, id, "released");
    add(
      tx
        .update(orders)
        .set({ status: "cancelled", ...updated() })
        .where(eq(orders.id, id)),
    );
    add(
      tx
        .update(payments)
        .set({ status: "failed", ...updated() })
        .where(eq(payments.orderId, id)),
    );
    add(audit(tx, actorId, "order.cancelled", id));
  });
}

export async function expirePending() {
  const db = await getDb();
  return atomic(async (tx, add) => {
    const rows = await tx
      .select({ order: orders, payment: payments })
      .from(orders)
      .innerJoin(payments, eq(payments.orderId, orders.id))
      .where(
        and(
          eq(orders.status, "pending"),
          lte(orders.expiresAt, new Date()),
          inArray(payments.status, ["ready", "failed"]),
        ),
      )
      .limit(100);
    for (const { order } of rows) {
      await coupons.settle(tx, add, order.id, "released");
      add(
        tx
          .update(orders)
          .set({ status: "expired", ...updated() })
          .where(eq(orders.id, order.id)),
      );
      add(
        tx
          .update(payments)
          .set({ status: "failed", ...updated() })
          .where(eq(payments.orderId, order.id)),
      );
      add(audit(tx, "system", "order.expired", order.id));
    }
    return rows.length;
  });
}
