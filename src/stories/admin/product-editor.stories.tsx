/* oxlint-disable custom/kebab-case-filename -- Storybook CSF convention. */
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import ProductEditorPage from "@/services/admin/page/product-editor";
import { adminRoutes } from "@/lib/admin-routes";
import { adminPageDecorators, adminPageParameters } from "./preview";
import { product } from "../fixtures";
import { courseRows, productRows } from "./fixtures";

const meta = {
  id: "admin-product-editor",
  title: "어드민/상품 편집",
  component: ProductEditorPage,
  args: { productId: product.id },
  decorators: adminPageDecorators,
  parameters: {
    ...adminPageParameters(adminRoutes.productEditor(product.id)),
    apiMock: { data: { products: productRows, courses: courseRows } },
  },
  tags: ["!autodocs"],
} satisfies Meta<typeof ProductEditorPage>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { name: "수정" };
export const Create: Story = {
  name: "새 상품",
  args: { productId: null },
  parameters: { ...adminPageParameters(adminRoutes.productEditor("new")) },
};
export const Loading: Story = {
  name: "로딩",
  parameters: { apiMock: { mode: "loading" } },
};
export const Error: Story = {
  name: "오류",
  parameters: { apiMock: { mode: "error" } },
};
