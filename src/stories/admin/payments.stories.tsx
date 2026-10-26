import { paymentRows } from "./fixtures";
/* oxlint-disable custom/kebab-case-filename -- Storybook CSF convention. */
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import PaymentsPage from "@/services/admin/page/payments";
import { adminRoutes } from "@/lib/admin-routes";
import { adminPageDecorators, adminPageParameters } from "./preview";
import { payment } from "../fixtures";

const meta = {
  id: "admin-payments",
  title: "어드민/결제",
  component: PaymentsPage,
  decorators: adminPageDecorators,
  parameters: { ...adminPageParameters(adminRoutes.payments) },
  tags: ["!autodocs"],
} satisfies Meta<typeof PaymentsPage>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: "목록",
  parameters: { apiMock: { data: { payments: paymentRows } } },
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

export const RefundPending: Story = {
  name: "환불 확인 필요",
  parameters: {
    apiMock: {
      data: {
        payments: [
          {
            ...payment,
            pendingRefundId: "pending-refund",
            status: "unknown",
            statusLabel: "확인 필요",
          },
        ],
      },
    },
  },
};
