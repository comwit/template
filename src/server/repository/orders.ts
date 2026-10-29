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
  products,
  purchases,
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
import * as purchaseRepository from "./purchases";
import { record as recordLead } from "./leads";
import {
  audit,
  CourseError,
  ensure,
  offset,
  paginate,
  platformSettings,
  stamp,
  updated,
  type Executor,
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
          like(orders.itemTitle, `%${filter.search}%`),
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
  const [paymentRows, refundRows, requestRows, enrollmentRows, purchaseRows, history] =
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
        .select({ id: purchases.id, status: purchases.status })
        .from(purchases)
        .where(eq(purchases.orderId, id)),
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
    purchase: purchaseRows[0] ?? null,
    canRequestRefund,
    history,
  };
}

type Sellable = {
  itemType: "course" | "product";
  id: string;
  title: string;
  price: number;
  discountPrice: number | null;
  discountEndsAt: Date | null;
};
/** 강의·상품 공통으로 결제 대상을 읽는다. 공개 상태만. */
export async function findSellable(
  db: Executor,
  itemType: "course" | "product",
  id: string,
): Promise<Sellable> {
  if (itemType === "course") {
    const [course] = await db
      .select()
      .from(courses)
      .where(
        and(eq(courses.id, id), isNull(courses.deletedAt), eq(courses.status, "published")),
      );
    ensure(course, "수강 신청할 수 없는 강의입니다.", "NOT_FOUND");
    return { itemType, ...course };
  }
  const [product] = await db
    .select()
    .from(products)
    .where(
      and(eq(products.id, id), isNull(products.deletedAt), eq(products.status, "published")),
    );
  ensure(product, "구매할 수 없는 상품입니다.", "NOT_FOUND");
  return { itemType, ...product };
}
async function alreadyOwned(item: Sellable, userId: string) {
  return item.itemType === "course"
    ? Boolean(await findActive(item.id, userId))
    : Boolean(await purchaseRepository.findActive(item.id, userId));
}

/** 결제 전 금액 미리보기. 쿠폰이 안 맞으면 오류 대신 couponError 로 알린다. */
export async function quote(input: QuoteInput, userId: string) {
  const db = await getDb();
  const item = await findSellable(db, input.itemType, input.itemId);
  const listPrice = item.price;
  const sale = salePrice(item);
  const discount = listPrice - sale;
  let couponDiscount = 0;
  let couponError: string | null = null;
  let couponCode: string | null = null;
  if (input.couponCode && sale > 0) {
    try {
      const result = await coupons.evaluate(db, input.couponCode, userId, item.itemType === "course" ? { itemType: "course", itemId: item.id } : { itemType: "product", itemId: item.id }, sale);
      couponDiscount = result.discount;
      couponCode = result.coupon.code;
    } catch (error) {
      couponError =
        error instanceof CourseError ? error.message : "쿠폰을 확인해주세요.";
    }
  } else if (input.couponCode) couponError = "무료 항목에는 쿠폰을 쓸 수 없습니다.";
  return {
    item,
    listPrice,
    discount,
    couponCode,
    couponDiscount,
    couponError,
    total: sale - couponDiscount,
    alreadyOwned: await alreadyOwned(item, userId),
  };
}

/**
 * 주문 생성. 유료는 pending 주문 + ready 결제를 만들고 토스 위젯이 이어서 결제한다.
 * 무료(총액 0)는 결제 없이 바로 confirmed 처리하고 같은 배치에서 수강·구매를 열며, 연락처를 리드로 남긴다.
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
        old.itemType === input.itemType &&
          (old.courseId ?? old.productId) === input.itemId &&
          (old.couponCode ?? null) === (input.couponCode ?? null),
        "다른 주문에 사용된 요청키입니다.",
      );
      return old;
    }
    const item = await findSellable(tx, input.itemType, input.itemId);
    ensure(
      !(await alreadyOwned(item, customer.id)),
      item.itemType === "course" ? "이미 수강 중인 강의입니다." : "이미 구매한 상품입니다.",
      "ALREADY_OWNED",
    );
    const [pendingOrder] = await tx
      .select({ id: orders.id })
      .from(orders)
      .where(
        and(
          eq(orders.customerId, customer.id),
          item.itemType === "course"
            ? eq(orders.courseId, item.id)
            : eq(orders.productId, item.id),
          eq(orders.status, "pending"),
        ),
      );
    ensure(
      !pendingOrder,
      "결제 대기 중인 주문이 있습니다. 결제 내역에서 취소하거나 이어서 결제해주세요.",
      "PENDING_ORDER",
    );
    const listPrice = item.price;
    const sale = salePrice(item);
    let couponDiscount = 0;
    let coupon: Awaited<ReturnType<typeof coupons.evaluate>>["coupon"] | null =
      null;
    if (input.couponCode) {
      ensure(sale > 0, "무료 항목에는 쿠폰을 쓸 수 없습니다.");
      const result = await coupons.evaluate(
        tx,
        input.couponCode,
        customer.id,
        { itemType: item.itemType, itemId: item.id },
        sale,
      );
      coupon = result.coupon;
      couponDiscount = result.discount;
    }
    const total = sale - couponDiscount;
    ensure(
      Number.isSafeInteger(total) && total >= 0 && total <= 1_000_000_000,
      "결제 금액을 확인해주세요.",
    );
    const free = total === 0;
    ensure(!free || input.contact, "무료 신청에는 이름과 이메일이 필요합니다.", "CONTACT_REQUIRED");
    const id = uuid();
    const order: typeof orders.$inferSelect = {
      id,
      number: `order-${id}`,
      customerId: customer.id,
      customerEmail: customer.email,
      requestKey: input.requestKey,
      itemType: item.itemType,
      courseId: item.itemType === "course" ? item.id : null,
      productId: item.itemType === "product" ? item.id : null,
      itemTitle: item.title,
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
      const openedId =
        item.itemType === "course"
          ? await enroll(tx, add, {
              courseId: item.id,
              userId: customer.id,
              source: "free",
              orderId: id,
            })
          : await purchaseRepository.open(tx, add, {
              productId: item.id,
              userId: customer.id,
              source: "free",
              orderId: id,
            });
      recordLead(tx, add, input.contact!, {
        userId: customer.id,
        source: item.itemType === "course" ? "free_course" : "free_product",
        courseId: order.courseId,
        productId: order.productId,
        orderId: id,
        itemTitle: item.title,
      });
      add(audit(tx, customer.id, "order.created", id, { free: true }));
      add(
        audit(
          tx,
          customer.id,
          item.itemType === "course" ? "enrollment.opened" : "purchase.opened",
          openedId,
          { orderId: id },
        ),
      );
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
