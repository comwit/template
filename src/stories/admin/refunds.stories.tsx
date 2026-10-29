/* oxlint-disable custom/kebab-case-filename -- Storybook CSF convention. */
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import RefundsPage from "@/services/admin/page/refunds";
import { adminRoutes } from "@/lib/admin-routes";
import { adminPageDecorators, adminPageParameters } from "./preview";
import { orderRows, refundRows } from "./fixtures";

const meta = {
  id: "admin-refunds",
  title: "어드민/환불 신청",
  component: RefundsPage,
  decorators: adminPageDecorators,
  parameters: { ...adminPageParameters(adminRoutes.refunds) },
  tags: ["!autodocs"],
} satisfies Meta<typeof RefundsPage>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: "목록",
  parameters: { apiMock: { data: { refundRequests: refundRows, orders: orderRows } } },
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
