import { kstCompactDateTime } from "@/lib/kst";
import type {
  CategoryView,
  MovementView,
  NotificationView,
  ProductView,
  OrderView,
  PaymentView,
  CustomerView,
  SettingsView,
  DashboardView,
} from "@/lib/commerce";
import type { User } from "@/services/app/api/user";
import {
  product,
  order,
  payment,
  customer,
  settings,
  dashboard,
} from "../fixtures";

export type MockData = {
  products: ProductView[];
  categories: CategoryView[];
  orders: OrderView[];
  payments: PaymentView[];
  customers: CustomerView[];
  notifications: NotificationView[];
  movements: Record<string, MovementView[]>;
  cart: Record<string, number>;
  settings: SettingsView;
  dashboard: DashboardView;
  appUser: User | null;
  adminUser: User | null;
};

export function createMockData(): MockData {
  const user: User = {
    id: customer.id,
    name: customer.name,
    email: customer.email,
    emailVerified: true,
    createdAt: new Date("2026-10-14T00:00:00Z"),
    updatedAt: new Date("2026-10-14T00:00:00Z"),
  };
  return structuredClone({
    products: [product],
    categories: [],
    orders: [order],
    payments: [payment],
    customers: [customer],
    movements: {},
    cart: { [product.skus[0].id]: 2 },
    settings,
    dashboard,
    appUser: user,
    adminUser: {
      ...user,
      id: "story-admin",
      name: "샘플 관리자",
      email: "admin@example.test",
    },
    notifications: [
      {
        id: "story-notification",
        orderNumber: order.displayNumber ?? order.number,
        eventLabel: "결제 완료",
        channelLabel: "문자",
        recipientLabel: "010-****-0000",
        preview: "주문 결제가 완료되었습니다.",
        status: "failed",
        statusLabel: "실패",
        errorLabel: "스토리북 예시",
        attempts: 1,
        createdLabel: kstCompactDateTime(new Date("2026-10-14T10:00:00+09:00")),
        canRetry: true,
        canReconcile: false,
      },
    ],
  });
}
