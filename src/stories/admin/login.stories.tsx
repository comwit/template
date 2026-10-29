/* oxlint-disable custom/kebab-case-filename -- Storybook CSF convention. */
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import LoginPage from "@/services/admin/page/login";
import { adminRoutes } from "@/lib/admin-routes";
import { adminPageDecorators, adminPageParameters } from "./preview";
import { expect, userEvent, within } from "storybook/test";
import { adminAuth } from "../mocks/auth-client";

const meta = {
  id: "admin-login",
  title: "어드민/로그인",
  component: LoginPage,
  decorators: adminPageDecorators,
  parameters: {
    ...adminPageParameters(adminRoutes.login),
    apiMock: { data: { adminUser: null } },
  },
  tags: ["!autodocs"],
} satisfies Meta<typeof LoginPage>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { name: "기본" };

export const Invalid: Story = {
  name: "로그인 오류",
  beforeEach: () => {
    adminAuth.signIn.email.mockResolvedValue({
      data: null,
      error: {
        message: "이메일 또는 비밀번호를 확인해주세요.",
        status: 401,
        statusText: "Unauthorized",
      },
    });
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(
      canvas.getByRole("textbox", { name: "이메일" }),
      "admin@example.test",
    );
    await userEvent.type(
      canvas.getByLabelText("비밀번호", { exact: false }),
      "storybook-preview",
    );
    await userEvent.click(canvas.getByRole("button", { name: "로그인" }));
    await expect(
      await canvas.findByText("이메일 또는 비밀번호를 확인해주세요."),
    ).toBeVisible();
  },
};
