/* oxlint-disable custom/kebab-case-filename -- Storybook CSF convention. */
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import LeadsPage from "@/services/admin/page/leads";
import { adminRoutes } from "@/lib/admin-routes";
import { adminPageDecorators, adminPageParameters } from "./preview";
import { leadRows } from "./fixtures";

const meta = {
  id: "admin-leads",
  title: "어드민/리드",
  component: LeadsPage,
  decorators: adminPageDecorators,
  parameters: { ...adminPageParameters(adminRoutes.leads) },
  tags: ["!autodocs"],
} satisfies Meta<typeof LeadsPage>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: "목록",
  parameters: { apiMock: { data: { leads: leadRows } } },
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
