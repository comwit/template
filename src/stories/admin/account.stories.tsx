/* oxlint-disable custom/kebab-case-filename -- Storybook CSF convention. */
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import AccountPage from "@/services/admin/page/account";
import { adminRoutes } from "@/lib/admin-routes";
import { adminPageDecorators, adminPageParameters } from "./preview";
import { expect, userEvent, within } from "storybook/test";

const meta = {
  id: "admin-account",
  title: "어드민/내 계정",
  component: AccountPage,
  decorators: adminPageDecorators,
  parameters: { ...adminPageParameters(adminRoutes.account) },
  tags: ["!autodocs"],
} satisfies Meta<typeof AccountPage>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { name: "기본" };

export const PasswordChanged: Story = {
  name: "비밀번호 변경 완료",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(
      canvas.getByLabelText("현재 비밀번호", { exact: false }),
      "storybook-current",
    );
    await userEvent.type(
      canvas.getByLabelText(/^새 비밀번호\s*\*?$/),
      "storybook-updated",
    );
    await userEvent.type(
      canvas.getByLabelText("새 비밀번호 확인", { exact: false }),
      "storybook-updated",
    );
    await userEvent.click(
      canvas.getByRole("button", { name: "비밀번호 변경" }),
    );
    await expect(
      await canvas.findByText("비밀번호를 변경했습니다."),
    ).toBeVisible();
  },
};
