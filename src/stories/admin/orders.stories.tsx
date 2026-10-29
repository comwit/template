/* oxlint-disable custom/kebab-case-filename -- Storybook CSF convention. */
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import OrdersPage from "@/services/admin/page/orders";
import { adminRoutes } from "@/lib/admin-routes";
import { adminPageDecorators, adminPageParameters } from "./preview";
import { orderRows, paymentRows, refundRows } from "./fixtures";

const meta = {
  id: "admin-orders",
  title: "어드민/주문",
  component: OrdersPage,
  decorators: adminPageDecorators,
  parameters: { ...adminPageParameters(adminRoutes.orders) },
  tags: ["!autodocs"],
} satisfies Meta<typeof OrdersPage>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: "목록",
  parameters: { apiMock: { data: { orders: orderRows, payments: paymentRows, refundRequests: refundRows } } },
};
export const Empty: Story = {
  name: "빈 화면",
  parameters: { apiMock: { mode: "empty" } },
};
export const Loading: Story = {
  name: "로딩",
  parameters: { apiMock: { mode: "loading" } },
};
export const Error: Story = {
  name: "오류",
  parameters: { apiMock: { mode: "error" } },
};
