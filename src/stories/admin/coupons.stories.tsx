/* oxlint-disable custom/kebab-case-filename -- Storybook CSF convention. */
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import CouponsPage from "@/services/admin/page/coupons";
import { adminRoutes } from "@/lib/admin-routes";
import { adminPageDecorators, adminPageParameters } from "./preview";
import { couponRows, courseRows } from "./fixtures";

const meta = {
  id: "admin-coupons",
  title: "어드민/쿠폰",
  component: CouponsPage,
  decorators: adminPageDecorators,
  parameters: { ...adminPageParameters(adminRoutes.coupons) },
  tags: ["!autodocs"],
} satisfies Meta<typeof CouponsPage>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: "목록",
  parameters: { apiMock: { data: { coupons: couponRows, courses: courseRows } } },
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
