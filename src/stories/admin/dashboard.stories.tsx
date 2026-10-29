/* oxlint-disable custom/kebab-case-filename -- Storybook CSF convention. */
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import DashboardPage from "@/services/admin/page/dashboard";
import { adminRoutes } from "@/lib/admin-routes";
import { adminPageDecorators, adminPageParameters } from "./preview";

const meta = {
  id: "admin-dashboard",
  title: "어드민/대시보드",
  component: DashboardPage,
  decorators: adminPageDecorators,
  parameters: { ...adminPageParameters(adminRoutes.dashboard) },
  tags: ["!autodocs"],
} satisfies Meta<typeof DashboardPage>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { name: "기본" };
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
