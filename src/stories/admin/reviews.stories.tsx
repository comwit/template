/* oxlint-disable custom/kebab-case-filename -- Storybook CSF convention. */
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import ReviewsPage from "@/services/admin/page/reviews";
import { adminRoutes } from "@/lib/admin-routes";
import { adminPageDecorators, adminPageParameters } from "./preview";
import { reviewRows } from "./fixtures";

const meta = {
  id: "admin-reviews",
  title: "어드민/수강평",
  component: ReviewsPage,
  decorators: adminPageDecorators,
  parameters: { ...adminPageParameters(adminRoutes.reviews) },
  tags: ["!autodocs"],
} satisfies Meta<typeof ReviewsPage>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: "목록",
  parameters: { apiMock: { data: { reviews: reviewRows } } },
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
