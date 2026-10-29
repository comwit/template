/* oxlint-disable custom/kebab-case-filename -- Storybook CSF convention. */
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import CoursesPage from "@/services/admin/page/courses";
import { adminRoutes } from "@/lib/admin-routes";
import { adminPageDecorators, adminPageParameters } from "./preview";
import { courseRows } from "./fixtures";

const meta = {
  id: "admin-courses",
  title: "어드민/강의",
  component: CoursesPage,
  decorators: adminPageDecorators,
  parameters: { ...adminPageParameters(adminRoutes.courses) },
  tags: ["!autodocs"],
} satisfies Meta<typeof CoursesPage>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: "목록",
  parameters: { apiMock: { data: { courses: courseRows } } },
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
