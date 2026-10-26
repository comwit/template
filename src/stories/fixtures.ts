import {
  formatMoney,
  formatPriceRange,
  formatOptions,
  formatOrderNumber,
} from "@/lib/commerce";
import { kstCompactDateTime } from "@/lib/kst";
import type {
  ProductView,
  InventoryView,
  OrderView,
  PaymentView,
  DashboardView,
  CustomerView,
  SettingsView,
} from "@/lib/commerce";
import type { ListQuery } from "@/services/admin/_components/commerce";
export const product: ProductView = {
  id: "0195aa00-1111-7111-8111-111111111111",
  name: "에센셜 코튼 티셔츠",
  slug: "essential-cotton-tee",
  description: "매일 편안하게 입는 코튼 티셔츠",
  categoryId: null,
  status: "active",
  statusLabel: "판매 중",
  images: [],
  createdLabel: kstCompactDateTime(new Date("2026-10-14T09:00:00+09:00")),
  priceLabel: formatPriceRange([29000]),
  skus: [
    {
      id: "0195aa00-2222-7222-8222-222222222222",
      code: "TEE-BLACK-M",
      options: [
        { name: "색상", value: "블랙" },
        { name: "사이즈", value: "M" },
      ],
      optionLabel: formatOptions([
        { name: "색상", value: "블랙" },
        { name: "사이즈", value: "M" },
      ]),
      price: 29000,
      priceLabel: formatMoney(29000),
      onHand: 24,
      reserved: 3,
      available: 21,
      active: true,
    },
  ],
};
export const inventory: InventoryView = {
  ...product.skus[0],
  productId: product.id,
  productName: product.name,
};
export const payment: PaymentView = {
  id: "0195aa00-4444-7444-8444-444444444444",
  orderId: "0195aa00-3333-7333-8333-333333333333",
  displayOrderNumber: formatOrderNumber(
    "order-0195aa00-3333-7333-8333-333333333333",
  ),
  providerOrderId: "order-0195aa00-3333-7333-8333-333333333333",
  status: "done",
  statusLabel: "결제 완료",
  amount: 58000,
  amountLabel: formatMoney(58000),
  refundedAmount: 0,
  refundedLabel: "0원",
  refundableAmount: 58000,
  mode: "test",
  method: "카드",
  receiptUrl: null,
  lastError: null,
  pendingRefundId: null,
  createdLabel: kstCompactDateTime(new Date("2026-10-14T10:00:00+09:00")),
};
export const order: OrderView = {
  id: payment.orderId,
  number: payment.providerOrderId,
  displayNumber: formatOrderNumber(
    "order-0195aa00-3333-7333-8333-333333333333",
  ),
  customerEmail: "customer@example.test",
  status: "confirmed",
  statusLabel: "주문 확인",
  paymentStatus: "paid",
  paymentLabel: "결제 완료",
  fulfillmentStatus: "unfulfilled",
  fulfillmentLabel: "발송 전",
  total: 58000,
  totalLabel: formatMoney(58000),
  createdLabel: kstCompactDateTime(new Date("2026-10-14T10:00:00+09:00")),
  expiresLabel: kstCompactDateTime(new Date("2026-10-14T10:30:00+09:00")),
  subtotalLabel: formatMoney(58000),
  shippingFee: 0,
  shippingLabel: "0원",
  address: {
    name: "샘플 고객",
    phone: "010-0000-0000",
    postalCode: "00000",
    address: "스토리북 예시 주소",
    detail: "101호",
    memo: "문 앞에 놓아주세요",
  },
  items: [
    {
      id: "0195aa00-5555-7555-8555-555555555555",
      skuId: inventory.id,
      name: product.name,
      skuCode: inventory.code,
      optionLabel: inventory.optionLabel,
      unitPrice: inventory.price,
      priceLabel: inventory.priceLabel,
      quantity: 2,
      refundedQuantity: 0,
      refundableQuantity: 2,
      image: null,
    },
  ],
  payment,
  refunds: [],
  shipment: null,
  history: [
    {
      id: "history-1",
      action: "결제 승인",
      createdLabel: kstCompactDateTime(new Date("2026-10-14T10:00:00+09:00")),
    },
  ],
};
export const dashboard: DashboardView = {
  products: 24,
  orders: 128,
  grossLabel: "5,824,000원",
  netLabel: "5,679,000원",
  refundedLabel: "145,000원",
  lowStock: 3,
  needsReview: 2,
  recent: [order],
};
export const customer: CustomerView = {
  id: "story-customer",
  name: "샘플 고객",
  email: "customer@example.test",
  emailVerified: true,
  createdLabel: kstCompactDateTime(new Date("2026-10-12T14:20:00+09:00")),
};
export const settings: SettingsView = {
  shippingFeeLabel: "3,000원",
  freeShippingThresholdLabel: "50,000원",
  name: "샘플 스토어",
  mode: "test",
  shippingFee: 3000,
  freeShippingThreshold: 50000,
  reservationMinutes: 30,
  paymentReady: false,
  notificationReady: false,
  notificationChannel: "sms",
  databaseReady: true,
  storageReady: true,
  appUrl: "https://shop.example.test",
};
export function listQuery<T>(
  items: T[],
  state: "ready" | "loading" | "error" = "ready",
): ListQuery<T> {
  return {
    data: {
      items,
      total: items.length,
      page: 1,
      limit: 10,
      totalPages: items.length ? 1 : 0,
    },
    isLoading: state === "loading",
    isFetching: false,
    isSuccess: state === "ready",
    isError: state === "error",
    error: state === "error" ? "데이터를 불러오지 못했습니다." : null,
  };
}
