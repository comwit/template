import "server-only";
import { kstCompactDateTime, kstRelativeTime } from "@/lib/kst";
import {
  formatMoney,
  formatPriceRange,
  formatOptions,
  formatOrderNumber,
  type ProductView,
  type SkuView,
  type OrderSummary,
  type OrderView,
  type PaymentView,
  type Address,
  type SkuOption,
} from "@/lib/commerce";
import type { ImageAsset } from "@/lib/image";
import type { products, skus, orders, payments } from "@/server/db/schema";
import type { orderRepository } from "@/server/repository";

const labels: Record<string, string> = {
  draft: "초안",
  active: "판매 중",
  archived: "판매 중지",
  pending: "대기",
  confirmed: "주문 확인",
  completed: "완료",
  cancelled: "취소",
  expired: "만료",
  unpaid: "미결제",
  processing: "승인 중",
  paid: "결제 완료",
  partially_refunded: "부분 환불",
  refunded: "전액 환불",
  failed: "실패",
  review: "확인 필요",
  unfulfilled: "발송 전",
  shipped: "배송 중",
  delivered: "배송 완료",
  ready: "결제 대기",
  confirming: "승인 확인 중",
  done: "결제 완료",
  partial_cancelled: "부분 취소",
  unknown: "확인 필요",
  succeeded: "완료",
  adjustment: "재고 조정",
  sale: "판매",
  return: "반품 입고",
};
const historyLabels: Record<string, string> = {
  "order.created": "주문 생성",
  "order.cancelled": "주문 취소",
  "order.expired": "결제 대기 만료",
  "payment.approved": "결제 승인",
  "payment.failed": "결제 실패",
  "payment.balance_synced": "결제 잔액 확인",
  "refund.requested": "환불 요청",
  "refund.succeeded": "환불 완료",
  "shipment.created": "상품 발송",
  "shipment.delivered": "배송 완료",
};
export const statusLabel = (status: string) => labels[status] ?? status;
export const optionsLabel = (raw: string) =>
  formatOptions(JSON.parse(raw) as SkuOption[]);
export function presentSku(sku: typeof skus.$inferSelect): SkuView {
  return {
    id: sku.id,
    code: sku.code,
    options: JSON.parse(sku.options),
    optionLabel: optionsLabel(sku.options),
    price: sku.price,
    priceLabel: formatMoney(sku.price),
    onHand: sku.onHand,
    reserved: sku.reserved,
    available: sku.onHand - sku.reserved,
    active: sku.active,
  };
}
export function presentProduct(
  product: typeof products.$inferSelect & {
    skus: (typeof skus.$inferSelect)[];
  },
): ProductView {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    categoryId: product.categoryId,
    status: product.status,
    statusLabel: statusLabel(product.status),
    images: JSON.parse(product.images),
    skus: product.skus.map(presentSku),
    priceLabel: formatPriceRange(product.skus.map((sku) => sku.price)),
    createdLabel: kstCompactDateTime(product.createdAt),
  };
}
export function presentOrder(order: typeof orders.$inferSelect): OrderSummary {
  return {
    id: order.id,
    number: order.number,
    displayNumber: formatOrderNumber(order.number),
    customerEmail: order.customerEmail,
    status: order.status,
    statusLabel: statusLabel(order.status),
    paymentStatus: order.paymentStatus,
    paymentLabel: statusLabel(order.paymentStatus),
    fulfillmentStatus: order.fulfillmentStatus,
    fulfillmentLabel: statusLabel(order.fulfillmentStatus),
    total: order.total,
    totalLabel: formatMoney(order.total),
    createdLabel: kstCompactDateTime(order.createdAt),
    expiresLabel: kstCompactDateTime(order.expiresAt),
  };
}
export function presentPayment(
  payment: typeof payments.$inferSelect,
): PaymentView {
  return {
    id: payment.id,
    orderId: payment.orderId,
    providerOrderId: payment.providerOrderId,
    displayOrderNumber: formatOrderNumber(payment.providerOrderId),
    status: payment.status,
    statusLabel: statusLabel(payment.status),
    amount: payment.amount,
    amountLabel: formatMoney(payment.amount),
    refundedAmount: payment.refundedAmount,
    refundedLabel: formatMoney(payment.refundedAmount),
    refundableAmount: payment.amount - payment.refundedAmount,
    mode: payment.mode,
    method: payment.method ?? "—",
    receiptUrl: payment.receiptUrl,
    lastError: payment.lastError,
    pendingRefundId: payment.pendingRefundId,
    createdLabel: kstCompactDateTime(payment.createdAt),
  };
}
export function presentOrderDetail(
  order: Awaited<ReturnType<typeof orderRepository.findById>>,
  admin = false,
): OrderView {
  return {
    ...presentOrder(order),
    subtotalLabel: formatMoney(order.subtotal),
    shippingFee: order.shippingFee,
    shippingLabel: formatMoney(order.shippingFee),
    address: JSON.parse(order.shippingAddress) as Address,
    items: order.items.map((i) => ({
      id: i.id,
      skuId: i.skuId,
      name: i.productName,
      skuCode: i.skuCode,
      optionLabel: optionsLabel(i.options),
      unitPrice: i.unitPrice,
      priceLabel: formatMoney(i.unitPrice),
      quantity: i.quantity,
      refundedQuantity: i.refundedQuantity,
      refundableQuantity: i.quantity - i.refundedQuantity,
      image: i.image ? (JSON.parse(i.image) as ImageAsset) : null,
    })),
    payment: order.payment ? presentPayment(order.payment) : null,
    refunds: order.refunds.map((r) => ({
      id: r.id,
      status: r.status,
      statusLabel: statusLabel(r.status),
      amountLabel: formatMoney(r.amount),
      reason: r.reason,
      restock: r.restock,
      createdLabel: kstCompactDateTime(r.createdAt),
    })),
    shipment: order.shipment
      ? {
          carrier: order.shipment.carrier,
          trackingNumber: order.shipment.trackingNumber,
          statusLabel: statusLabel(order.shipment.status),
        }
      : null,
    history: admin
      ? order.history.map((h) => ({
          id: h.id,
          action: historyLabels[h.action] ?? "처리 상태 변경",
          createdLabel: kstCompactDateTime(h.createdAt),
        }))
      : [],
  };
}

export function presentNotification(
  row: Awaited<
    ReturnType<
      typeof import("@/server/repository").notificationRepository.findAll
    >
  >["items"][number],
): import("@/lib/commerce").NotificationView {
  const n = row.notification;
  const labels: Record<string, string> = {
    pending: "대기",
    sending: "요청 중",
    submitted: "접수",
    delivered: "전달 완료",
    failed: "실패",
    unknown: "확인 필요",
    skipped: "발송 안 함",
  };
  const events: Record<string, string> = {
    paid: "결제 완료",
    shipped: "배송 시작",
    delivered: "배송 완료",
    refunded: "환불 완료",
    cancelled: "주문 취소",
  };
  const errors: Record<string, string> = {
    NOT_CONFIGURED: "연동 전 · 발송 생략",
    INVALID_PHONE: "연락처 확인",
    RESULT_NOT_FOUND: "발송 내역 확인 필요",
    RESPONSE_UNKNOWN: "응답 미확인",
    LOOKUP_FAILED: "조회 실패",
    DUPLICATE_REVIEW: "중복 내역 확인 필요",
  };
  return {
    id: n.id,
    orderNumber: formatOrderNumber(row.orderNumber),
    eventLabel: events[n.event],
    channelLabel: n.channel === "alimtalk" ? "알림톡" : "문자",
    recipientLabel: n.recipient
      ? `${n.recipient.slice(0, 3)}-****-${n.recipient.slice(-4)}`
      : "연락처 확인",
    preview: (JSON.parse(n.message) as { text: string }).text,
    status: n.status,
    statusLabel: labels[n.status],
    errorLabel: n.lastError
      ? (errors[n.lastError] ?? "발송 설정·내역 확인")
      : null,
    attempts: n.attempts,
    createdLabel: kstRelativeTime(n.createdAt),
    canRetry: n.status === "failed" && n.attempts < 5,
    canReconcile: ["submitted", "unknown", "sending"].includes(n.status),
  };
}
