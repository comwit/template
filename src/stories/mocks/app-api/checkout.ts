import type { CheckoutAPI } from "@/services/app/api/checkout";
import {
  couponDiscount,
  formatMoney,
  formatOrderNumber,
  type CouponView,
  type ItemType,
  type LeadView,
  type OrderView,
  type QuoteView,
} from "@/lib/course";
import { findItem, mockApi } from "../runtime";
import { nowLabel, statusLabel } from "../labels";
import { openEnrollment, openPurchase, type Owner } from "../grants";
import type { MockData } from "../data";

/** 결제 대상(공개된 강의·상품)의 가격 정보만 뽑는다. */
function findItemForSale(db: MockData, itemType: ItemType, itemId: string) {
  if (itemType === "course") {
    const course = findItem(
      db.courses.filter((item) => item.status === "published"),
      itemId,
    );
    return { id: course.id, title: course.title, price: course.price, salePrice: course.salePrice };
  }
  const product = findItem(
    db.products.filter((item) => item.status === "published"),
    itemId,
  );
  return { id: product.id, title: product.title, price: product.price, salePrice: product.salePrice };
}

function alreadyOwned(db: MockData, itemType: ItemType, itemId: string) {
  const userId = db.appUser?.id;
  return itemType === "course"
    ? db.enrollments.some(
        (item) => item.courseId === itemId && item.userId === userId && item.status === "active",
      )
    : db.purchases.some(
        (item) => item.productId === itemId && item.userId === userId && item.status === "active",
      );
}

function buildQuote(
  db: MockData,
  input: { itemType: ItemType; itemId: string; couponCode: string | null },
): QuoteView & { coupon: CouponView | null } {
  const item = findItemForSale(db, input.itemType, input.itemId);
  const listPrice = item.price;
  const discount = item.price - item.salePrice;
  let coupon: CouponView | null = null;
  let couponError: string | null = null;
  let discountByCoupon = 0;
  if (input.couponCode) {
    const found = db.coupons.find((entry) => entry.code === input.couponCode);
    const limitedTo =
      found?.courseId ? { itemType: "course" as const, itemId: found.courseId }
      : found?.productId ? { itemType: "product" as const, itemId: found.productId }
      : null;
    if (!found || found.status !== "active")
      couponError = "사용할 수 없는 쿠폰입니다.";
    else if (
      limitedTo &&
      (limitedTo.itemType !== input.itemType || limitedTo.itemId !== item.id)
    )
      couponError =
        input.itemType === "course"
          ? "이 강의에는 적용되지 않는 쿠폰입니다."
          : "이 상품에는 적용되지 않는 쿠폰입니다.";
    else if (item.salePrice < found.minAmount)
      couponError = `${found.minAmountLabel} 이상 결제할 때 쓸 수 있습니다.`;
    else {
      coupon = found;
      discountByCoupon = couponDiscount(found, item.salePrice);
    }
  }
  const total = item.salePrice - discountByCoupon;
  return {
    itemType: input.itemType,
    itemId: item.id,
    itemTitle: item.title,
    requiresContact: total === 0,
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
    alreadyEnrolled: alreadyOwned(db, input.itemType, item.id),
    coupon,
  };
}

/** 결제 완료·무료 신청 뒤 수강 또는 구매를 열고 주문에 연결한다. */
function fulfil(db: MockData, order: OrderView, source: "order" | "free") {
  const owner: Owner = {
    userId: order.customerId,
    userEmail: order.customerEmail,
    userName: db.appUser?.name ?? "",
    source,
    orderId: order.id,
  };
  if (order.itemType === "course" && order.courseId) {
    order.enrollmentId = openEnrollment(db, order.courseId, owner).id;
    order.history.push({ id: crypto.randomUUID(), action: "수강 시작", createdLabel: nowLabel() });
  } else if (order.productId) {
    order.purchaseId = openPurchase(db, order.productId, owner).id;
    order.history.push({ id: crypto.randomUUID(), action: "구매 완료", createdLabel: nowLabel() });
  }
}

const continueUrlOf = (itemType: ItemType, itemId: string) =>
  itemType === "course" ? `/learn/${itemId}` : "/account/products";

export const checkout = {
  quote: mockApi<CheckoutAPI["quote"]>((db, input) => {
    const { coupon: _coupon, ...quote } = buildQuote(db, input);
    return quote;
  }),
  prepare: mockApi<CheckoutAPI["prepare"]>((db, input) => {
    if (!db.appUser) throw new Error("로그인이 필요합니다.");
    const quote = buildQuote(db, input);
    if (quote.alreadyEnrolled)
      throw new Error(
        input.itemType === "course" ? "이미 수강 중인 강의입니다." : "이미 구매한 상품입니다.",
      );
    if (quote.couponError) throw new Error(quote.couponError);
    const free = quote.total === 0;
    if (free && !input.contact)
      throw new Error("무료 신청에는 이름과 이메일이 필요합니다.");
    const id = crypto.randomUUID();
    const number = "story-" + id;
    const order: OrderView = {
      id,
      number,
      displayNumber: formatOrderNumber(number),
      customerId: db.appUser.id,
      customerEmail: db.appUser.email,
      itemType: quote.itemType,
      itemTypeLabel: statusLabel(quote.itemType),
      itemId: quote.itemId,
      itemTitle: quote.itemTitle,
      courseId: quote.itemType === "course" ? quote.itemId : null,
      productId: quote.itemType === "product" ? quote.itemId : null,
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
      purchaseId: null,
      history: [
        { id: crypto.randomUUID(), action: "주문 생성", createdLabel: nowLabel() },
      ],
    };
    db.orders.unshift(order);
    if (quote.coupon) quote.coupon.usedCount += 1;
    if (free && input.contact) {
      const lead: LeadView = {
        id: crypto.randomUUID(),
        userId: db.appUser.id,
        name: input.contact.name,
        email: input.contact.email,
        phone: input.contact.phone,
        source: quote.itemType === "course" ? "free_course" : "free_product",
        sourceLabel: statusLabel(
          quote.itemType === "course" ? "free_course" : "free_product",
        ),
        itemTitle: quote.itemTitle,
        courseId: order.courseId,
        productId: order.productId,
        consent: input.contact.consent,
        note: "",
        createdLabel: nowLabel(),
      };
      db.leads.unshift(lead);
      fulfil(db, order, "free");
    }
    return {
      id,
      orderId: number,
      orderName: quote.itemTitle,
      amount: quote.total,
      free,
      itemType: quote.itemType,
      itemId: quote.itemId,
      continueUrl: continueUrlOf(quote.itemType, quote.itemId),
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
      itemTitle: order.itemTitle,
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
    fulfil(db, order, "order");
    return order;
  }),
} satisfies CheckoutAPI;
