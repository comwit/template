import { productRows } from "./fixtures";
/* oxlint-disable custom/kebab-case-filename -- Storybook CSF convention. */
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import InventoryPage from "@/services/admin/page/inventory";
import { adminRoutes } from "@/lib/admin-routes";
import { adminPageDecorators, adminPageParameters } from "./preview";
import { expect, userEvent, waitFor, within } from "storybook/test";

const meta = {
  id: "admin-inventory",
  title: "어드민/재고",
  component: InventoryPage,
  decorators: adminPageDecorators,
  parameters: { ...adminPageParameters(adminRoutes.inventory) },
  tags: ["!autodocs"],
} satisfies Meta<typeof InventoryPage>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: "목록",
  parameters: { apiMock: { data: { products: productRows } } },
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

export const Adjust: Story = {
  name: "입출고 입력",
  play: async ({ canvasElement }) => {
    await userEvent.click(
      await within(canvasElement).findByRole("button", {
        name: "TEE-BLACK-M 재고 조정·이력",
      }),
    );
    const dialog = await within(canvasElement.ownerDocument.body).findByRole(
      "dialog",
    );
    await waitFor(() => expect(dialog).toBeVisible());
  },
};
