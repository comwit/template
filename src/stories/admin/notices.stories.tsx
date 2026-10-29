/* oxlint-disable custom/kebab-case-filename -- Storybook CSF convention. */
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import NoticesPage from "@/services/admin/page/notices";
import { adminRoutes } from "@/lib/admin-routes";
import { adminPageDecorators, adminPageParameters } from "./preview";
import { noticeRows } from "./fixtures";

const meta = {
  id: "admin-notices",
  title: "어드민/공지",
  component: NoticesPage,
  decorators: adminPageDecorators,
  parameters: { ...adminPageParameters(adminRoutes.notices) },
  tags: ["!autodocs"],
} satisfies Meta<typeof NoticesPage>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: "목록",
  parameters: { apiMock: { data: { notices: noticeRows } } },
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
