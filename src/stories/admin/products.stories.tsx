import { productRows } from "./fixtures";
/* oxlint-disable custom/kebab-case-filename -- Storybook CSF convention. */
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import ProductsPage from "@/services/admin/page/products";
import { adminRoutes } from "@/lib/admin-routes";
import { adminPageDecorators, adminPageParameters } from "./preview";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { adminCatalog } from "../mocks/admin-api/catalog";
import { product } from "../fixtures";

const meta = {
  id: "admin-products",
  title: "어드민/상품",
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

export const Create: Story = {
  name: "등록",
  play: async ({ canvasElement }) => {
    await userEvent.click(
      await within(canvasElement).findByRole("button", { name: "상품 등록" }),
    );
    const dialog = await within(canvasElement.ownerDocument.body).findByRole(
      "dialog",
    );
    await waitFor(() => expect(dialog).toBeVisible());
  },
};
export const Edit: Story = {
  name: "수정",
  play: async ({ canvasElement }) => {
    await userEvent.click(
      await within(canvasElement).findByRole("button", {
        name: "에센셜 코튼 티셔츠 수정",
      }),
    );
    const dialog = within(
      await within(canvasElement.ownerDocument.body).findByRole("dialog"),
    );
    await expect(
      await dialog.findByRole("textbox", { name: "상품명" }),
    ).toHaveValue(product.name);
  },
};
export const AddOption: Story = {
  name: "옵션 추가",
  play: async ({ canvasElement }) => {
    await userEvent.click(
      await within(canvasElement).findByRole("button", {
        name: "에센셜 코튼 티셔츠 수정",
      }),
    );
    const dialog = within(
      await within(canvasElement.ownerDocument.body).findByRole("dialog"),
    );
    await userEvent.click(
      await dialog.findByRole("button", { name: "SKU 추가" }),
    );
    await expect(
      dialog.getByRole("textbox", { name: "SKU 코드 2" }),
    ).toBeVisible();
  },
};
export const Save: Story = {
  name: "저장",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      await canvas.findByRole("button", { name: "에센셜 코튼 티셔츠 수정" }),
    );
    const dialog = within(
      await within(canvasElement.ownerDocument.body).findByRole("dialog"),
    );
    const name = await dialog.findByRole("textbox", { name: "상품명" });
    await userEvent.clear(name);
    await userEvent.type(name, "스토리북 저장 상품");
    await userEvent.click(dialog.getByRole("button", { name: "저장" }));
    await expect(
      await canvas.findByRole("button", { name: "스토리북 저장 상품 수정" }),
    ).toBeInTheDocument();
    await expect(adminCatalog.save).toHaveBeenCalledWith(
      expect.objectContaining({ name: "스토리북 저장 상품" }),
    );
  },
};
export const Categories: Story = {
  name: "카테고리",
  play: async ({ canvasElement }) => {
    await userEvent.click(
      await within(canvasElement).findByRole("button", {
        name: "카테고리 관리",
      }),
    );
    const dialog = await within(canvasElement.ownerDocument.body).findByRole(
      "dialog",
    );
    await waitFor(() => expect(dialog).toBeVisible());
  },
};
export const LongValues: Story = {
  name: "긴 데이터",
  parameters: {
    apiMock: {
      data: {
        products: [
          {
            ...product,
            name: "오가닉 코튼 오버사이즈 스트라이프 롱 슬리브 티셔츠 리미티드 에디션",
            slug: "organic-cotton-oversized-striped-long-sleeve-limited-edition",
            priceLabel: "1,290,000–1,590,000원",
          },
        ],
      },
    },
  },
};
