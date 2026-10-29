/* oxlint-disable custom/kebab-case-filename -- Storybook CSF convention. */
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import ProductsPage from "@/services/admin/page/products";
import { adminRoutes } from "@/lib/admin-routes";
import { adminPageDecorators, adminPageParameters } from "./preview";
import { productRows } from "./fixtures";

const meta = {
  id: "admin-products",
  title: "어드민/디지털 상품",
  component: ProductsPage,
  decorators: adminPageDecorators,
  parameters: { ...adminPageParameters(adminRoutes.products) },
  tags: ["!autodocs"],
} satisfies Meta<typeof ProductsPage>;
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
