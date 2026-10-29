/* oxlint-disable custom/kebab-case-filename -- Storybook CSF convention. */
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import StudentsPage from "@/services/admin/page/students";
import { adminRoutes } from "@/lib/admin-routes";
import { adminPageDecorators, adminPageParameters } from "./preview";
import { enrollmentRows, studentRows } from "./fixtures";

const meta = {
  id: "admin-students",
  title: "어드민/수강생",
  component: StudentsPage,
  decorators: adminPageDecorators,
  parameters: { ...adminPageParameters(adminRoutes.students) },
  tags: ["!autodocs"],
} satisfies Meta<typeof StudentsPage>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: "목록",
  parameters: { apiMock: { data: { students: studentRows, enrollments: enrollmentRows } } },
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
