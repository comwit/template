import type { CheckoutAPI } from "@/services/app/api/checkout";
import {
  couponDiscount,
  formatMoney,
  formatOrderNumber,
  type CouponView,
  type EnrollmentView,
  type OrderView,
  type QuoteView,
} from "@/lib/course";
import { findItem, mockApi } from "../runtime";
import { nowLabel, statusLabel } from "../labels";
import type { MockData } from "../data";

function buildQuote(
  db: MockData,
  courseId: string,
  couponCode: string | null,
): QuoteView & { coupon: CouponView | null } {
  const course = findItem(
    db.courses.filter((item) => item.status === "published"),
    courseId,
  );
  const listPrice = course.price;
  const discount = course.price - course.salePrice;
  let coupon: CouponView | null = null;
  let couponError: string | null = null;
  let discountByCoupon = 0;
  if (couponCode) {
    const found = db.coupons.find((item) => item.code === couponCode);
    if (!found || found.status !== "active")
      couponError = "사용할 수 없는 쿠폰입니다.";
    else if (found.courseId && found.courseId !== course.id)
      couponError = "이 강의에는 적용되지 않는 쿠폰입니다.";
    else if (course.salePrice < found.minAmount)
      couponError = `${found.minAmountLabel} 이상 결제할 때 쓸 수 있습니다.`;
    else {
      coupon = found;
      discountByCoupon = couponDiscount(found, course.salePrice);
    }
  }
  const total = course.salePrice - discountByCoupon;
  return {
    courseId: course.id,
    courseTitle: course.title,
    listPrice,
    listPriceLabel: formatMoney(listPrice),
    discount,
    couponCode: coupon?.code ?? null,
    couponDiscount: discountByCoupon,
    couponDiscountLabel: formatMoney(discountByCoupon),
    couponError,
    total,
    totalLabel: formatMoney(total),
    isFree: total === 0,
    alreadyEnrolled: db.enrollments.some(
      (item) =>
        item.courseId === course.id &&
        item.userId === db.appUser?.id &&
        item.status === "active",
    ),
    coupon,
  };
}

function openEnrollment(db: MockData, order: OrderView, source: "order" | "free") {
  const course = findItem(db.courses, order.courseId);
  const enrollment: EnrollmentView = {
    id: crypto.randomUUID(),
    courseId: course.id,
    courseTitle: course.title,
    courseSlug: course.slug,
    thumbnail: course.thumbnail,
    userId: order.customerId,
    userEmail: order.customerEmail,
    userName: db.appUser?.name ?? "",
    orderId: order.id,
    source,
    sourceLabel: statusLabel(source),
    status: "active",
    statusLabel: statusLabel("active"),
    progressPercent: 0,
    completedLessons: 0,
    lessonCount: course.lessonCount,
    lastLessonId: null,
    startedLabel: nowLabel(),
    completedLabel: null,
    expiresLabel: null,
    certificateId: null,
  };
  db.enrollments.unshift(enrollment);
  order.enrollmentId = enrollment.id;
  course.enrollmentCount += 1;
  order.history.push({
    id: crypto.randomUUID(),
    action: "수강 시작",
    createdLabel: nowLabel(),
  });
  return enrollment;
}

export const checkout = {
  quote: mockApi<CheckoutAPI["quote"]>((db, input) => {
    const { coupon: _coupon, ...quote } = buildQuote(
      db,
      input.courseId,
      input.couponCode,
    );
    return quote;
  }),
  prepare: mockApi<CheckoutAPI["prepare"]>((db, input) => {
    if (!db.appUser) throw new Error("로그인이 필요합니다.");
    const quote = buildQuote(db, input.courseId, input.couponCode);
    if (quote.alreadyEnrolled) throw new Error("이미 수강 중인 강의입니다.");
    if (quote.couponError) throw new Error(quote.couponError);
    const id = crypto.randomUUID();
    const number = "story-" + id;
    const free = quote.total === 0;
    const order: OrderView = {
      id,
      number,
      displayNumber: formatOrderNumber(number),
      customerId: db.appUser.id,
      customerEmail: db.appUser.email,
      courseId: quote.courseId,
      courseTitle: quote.courseTitle,
      status: free ? "confirmed" : "pending",
      statusLabel: statusLabel(free ? "confirmed" : "pending"),
      paymentStatus: free ? "free" : "unpaid",
      paymentLabel: statusLabel(free ? "free" : "unpaid"),
      listPrice: quote.listPrice,
      discount: quote.discount,
      couponDiscount: quote.couponDiscount,
      couponCode: quote.couponCode,
      total: quote.total,
      totalLabel: quote.totalLabel,
      createdLabel: nowLabel(),
      expiresLabel: nowLabel(),
      listPriceLabel: quote.listPriceLabel,
      discountLabel: formatMoney(quote.discount),
      couponDiscountLabel: quote.couponDiscountLabel,
      payment: null,
      refunds: [],
      refundRequest: null,
      canRequestRefund: false,
      enrollmentId: null,
      history: [
        { id: crypto.randomUUID(), action: "주문 생성", createdLabel: nowLabel() },
      ],
    };
    db.orders.unshift(order);
    if (quote.coupon) quote.coupon.usedCount += 1;
    if (free) openEnrollment(db, order, "free");
    return {
      id,
      orderId: number,
      orderName: quote.courseTitle,
      amount: quote.total,
      free,
      courseId: quote.courseId,
      clientKey: "storybook-only",
      customerKey: db.appUser.id,
      customerEmail: db.appUser.email,
      successUrl: "https://example.test/storybook/checkout/result",
      failUrl: "https://example.test/storybook/checkout/result",
      mode: "test",
    };
  }),
  confirm: mockApi<CheckoutAPI["confirm"]>((db, input) => {
    const order = db.orders.find((item) => item.number === input.orderId);
    if (!order || order.total !== input.amount)
      throw new Error("예시 주문을 확인해주세요.");
    if (order.status === "confirmed") return order;
    if (order.status !== "pending")
      throw new Error("결제할 수 없는 주문입니다.");
    const paymentId = crypto.randomUUID();
    const payment = {
      id: paymentId,
      orderId: order.id,
      providerOrderId: order.number,
      displayOrderNumber: order.displayNumber,
      status: "done",
      statusLabel: statusLabel("done"),
      amount: order.total,
      amountLabel: order.totalLabel,
      refundedAmount: 0,
      refundedLabel: formatMoney(0),
      refundableAmount: order.total,
      mode: "test" as const,
      method: "카드",
      receiptUrl: null,
      lastError: null,
      pendingRefundId: null,
      createdLabel: nowLabel(),
    };
    db.payments.unshift({
      ...payment,
      customerEmail: order.customerEmail,
      courseTitle: order.courseTitle,
    });
    Object.assign(order, {
      status: "confirmed",
      statusLabel: statusLabel("confirmed"),
      paymentStatus: "paid",
      paymentLabel: statusLabel("paid"),
      payment,
      canRequestRefund: true,
    });
    order.history.push({
      id: crypto.randomUUID(),
      action: "결제 승인",
      createdLabel: nowLabel(),
    });
    openEnrollment(db, order, "order");
    return order;
  }),
} satisfies CheckoutAPI;
