/* oxlint-disable custom/kebab-case-filename -- Storybook CSF convention. */
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import CourseEditorPage from "@/services/admin/page/course-editor";
import { adminRoutes } from "@/lib/admin-routes";
import { adminPageDecorators, adminPageParameters } from "./preview";
import { course } from "../fixtures";
import { courseRows } from "./fixtures";

const meta = {
  id: "admin-course-editor",
  title: "어드민/강의 편집",
  component: CourseEditorPage,
  args: { courseId: course.id },
  decorators: adminPageDecorators,
  parameters: {
    ...adminPageParameters(adminRoutes.courseEditor(course.id)),
    apiMock: { data: { courses: courseRows } },
  },
  tags: ["!autodocs"],
} satisfies Meta<typeof CourseEditorPage>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { name: "수정" };
export const Create: Story = {
  name: "새 강의",
  args: { courseId: null },
  parameters: { ...adminPageParameters(adminRoutes.courseEditor("new")) },
};
export const Loading: Story = {
  name: "로딩",
  parameters: { apiMock: { mode: "loading" } },
};
export const Error: Story = {
  name: "오류",
  parameters: { apiMock: { mode: "error" } },
};
