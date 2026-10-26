/* oxlint-disable custom/kebab-case-filename -- Storybook CSF convention. */
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import NotificationsPage from "@/services/admin/page/notifications";
import { adminRoutes } from "@/lib/admin-routes";
import { adminPageDecorators, adminPageParameters } from "./preview";
import { expect, userEvent, waitFor, within } from "storybook/test";

const meta = {
  id: "admin-notifications",
  title: "어드민/알림",
  component: NotificationsPage,
  decorators: adminPageDecorators,
  parameters: { ...adminPageParameters(adminRoutes.notifications) },
  tags: ["!autodocs"],
} satisfies Meta<typeof NotificationsPage>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { name: "목록" };
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

export const Message: Story = {
  name: "발송 내용",
  play: async ({ canvasElement }) => {
    await userEvent.click(
      await within(canvasElement).findByRole("button", {
        name: "알림 내용 보기",
      }),
    );
    const message = await within(canvasElement.ownerDocument.body).findByText(
      "주문 결제가 완료되었습니다.",
    );
    await waitFor(() => expect(message).toBeVisible());
  },
};
