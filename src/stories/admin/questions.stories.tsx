/* oxlint-disable custom/kebab-case-filename -- Storybook CSF convention. */
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import QuestionsPage from "@/services/admin/page/questions";
import { adminRoutes } from "@/lib/admin-routes";
import { adminPageDecorators, adminPageParameters } from "./preview";
import { questionRows } from "./fixtures";

const meta = {
  id: "admin-questions",
  title: "어드민/Q&A",
  component: QuestionsPage,
  decorators: adminPageDecorators,
  parameters: { ...adminPageParameters(adminRoutes.questions) },
  tags: ["!autodocs"],
} satisfies Meta<typeof QuestionsPage>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: "목록",
  parameters: { apiMock: { data: { questions: questionRows } } },
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
