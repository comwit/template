/* oxlint-disable custom/kebab-case-filename -- Storybook CSF convention. */
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import SettingsPage from "@/services/admin/page/settings";
import { adminRoutes } from "@/lib/admin-routes";
import { adminPageDecorators, adminPageParameters } from "./preview";
import { settings } from "../fixtures";

const meta = {
  id: "admin-settings",
  title: "어드민/연결 설정",
  component: SettingsPage,
  decorators: adminPageDecorators,
  parameters: { ...adminPageParameters(adminRoutes.settings) },
  tags: ["!autodocs"],
} satisfies Meta<typeof SettingsPage>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { name: "기본" };
export const Loading: Story = {
  name: "로딩",
  parameters: { apiMock: { mode: "loading" } },
};
export const Error: Story = {
  name: "오류",
  parameters: { apiMock: { mode: "error" } },
};

export const Connected: Story = {
  name: "연결 완료",
  parameters: {
    apiMock: {
      data: {
        settings: {
          ...settings,
          mode: "live",
          paymentReady: true,
          notificationReady: true,
        },
      },
    },
  },
};
