import type { ImageAsset } from "@/lib/image";
import type { Address, SkuOption } from "./index";
export type SkuView = {
  id: string;
  code: string;
  options: SkuOption[];
  optionLabel: string;
  price: number;
  priceLabel: string;
  onHand: number;
  reserved: number;
  available: number;
  active: boolean;
};
export type ProductView = {
  id: string;
  name: string;
  slug: string;
  description: string;
  categoryId: string | null;
  status: "draft" | "active" | "archived";
  statusLabel: string;
  images: ImageAsset[];
  skus: SkuView[];
  priceLabel: string;
  createdLabel: string;
};
export type OrderSummary = {
  displayNumber?: string;
  id: string;
  number: string;
  customerEmail: string;
  status: string;
  statusLabel: string;
  paymentStatus: string;
  paymentLabel: string;
  fulfillmentStatus: string;
  fulfillmentLabel: string;
  total: number;
  totalLabel: string;
  createdLabel: string;
  expiresLabel: string;
};
export type PaymentView = {
  displayOrderNumber?: string;
  id: string;
  orderId: string;
  providerOrderId: string;
  status: string;
  statusLabel: string;
  amount: number;
  amountLabel: string;
  refundedAmount: number;
  refundedLabel: string;
  refundableAmount: number;
  mode: "test" | "live";
  method: string;
  receiptUrl: string | null;
  lastError: string | null;
  pendingRefundId: string | null;
  createdLabel: string;
};
export type OrderView = OrderSummary & {
  subtotalLabel: string;
  shippingFee: number;
  shippingLabel: string;
  address: Address;
  items: {
    id: string;
    skuId: string;
    name: string;
    skuCode: string;
    optionLabel: string;
    unitPrice: number;
    priceLabel: string;
    quantity: number;
    refundedQuantity: number;
    refundableQuantity: number;
    image: ImageAsset | null;
  }[];
  payment: PaymentView | null;
  refunds: {
    id: string;
    status: string;
    statusLabel: string;
    amountLabel: string;
    reason: string;
    restock: boolean;
    createdLabel: string;
  }[];
  shipment: {
    carrier: string;
    trackingNumber: string;
    statusLabel: string;
  } | null;
  history: { id: string; action: string; createdLabel: string }[];
};
export type InventoryView = SkuView & {
  productName: string;
  productId: string;
};
export type CategoryView = { id: string; name: string; slug: string };
export type MovementView = {
  id: string;
  quantity: number;
  kindLabel: string;
  reason: string;
  createdLabel: string;
};
export type DashboardView = {
  products: number;
  orders: number;
  grossLabel: string;
  netLabel: string;
  refundedLabel: string;
  lowStock: number;
  needsReview: number;
  recent: OrderSummary[];
};
export type CustomerView = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  createdLabel: string;
};
export type SettingsView = {
  shippingFeeLabel?: string;
  freeShippingThresholdLabel?: string;
  name: string;
  mode: "test" | "live";
  shippingFee: number;
  freeShippingThreshold: number;
  reservationMinutes: number;
  paymentReady: boolean;
  notificationReady: boolean;
  notificationChannel: "sms" | "alimtalk";
  databaseReady: boolean;
  storageReady: boolean;
  appUrl: string | null;
};
export type CartView = {
  items: {
    skuId: string;
    name: string;
    optionLabel: string;
    quantity: number;
    available: number;
    unitPrice: number;
    priceLabel: string;
    purchasable: boolean;
  }[];
  subtotal: number;
  shippingFee: number;
  total: number;
  totalLabel: string;
};
export type CheckoutView = {
  id: string;
  orderId: string;
  orderName: string;
  amount: number;
  clientKey: string;
  customerKey: string;
  customerEmail: string;
  successUrl: string;
  failUrl: string;
  mode: "test" | "live";
};

export type NotificationView = {
  id: string;
  orderNumber: string;
  eventLabel: string;
  channelLabel: string;
  recipientLabel: string;
  preview: string;
  status: string;
  statusLabel: string;
  errorLabel: string | null;
  attempts: number;
  createdLabel: string;
  canRetry: boolean;
  canReconcile: boolean;
};
