/* oxlint-disable custom/kebab-case-filename -- Storybook CSF convention. */
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Suspense, useState } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";
import ProductDetail, {
  ProductDetailSkeleton,
} from "@/services/app/page/product-detail";
import Products, {
  ProductList,
  ProductListSkeleton,
} from "@/services/app/page/products";
import { catalog } from "../mocks/app-api/catalog";
import { product } from "../fixtures";

/** 정식 라우트 `products/[id]` 와 같은 경계: 상세 뼈대 fallback 안에서 뷰 하나가 `.suspend(id)` 한다. */
function Route({ productId }: { productId: string }) {
  return (
    <Suspense fallback={<ProductDetailSkeleton />}>
      <ProductDetail productId={productId} />
    </Suspense>
  );
}

/**
 * 목록 → 상세 소프트 내비를 실제 순서로 흉내 낸다. 목록 화면이 먼저 그려져 list 캐시를 채우고, 카드 클릭이 상세 라우트를
 * 마운트한다(라우터 이동만 막는다). store 에 직접 쓰는 것은 없다 — detail 의 `seed` 가 그 캐시에서 항목을 찾아 그려야 한다.
 */
function FromList({ productId }: { productId: string }) {
  const [opened, setOpened] = useState(false);
  if (opened) return <Route productId={productId} />;
  return (
    <div
      onClickCapture={(event) => {
        if (!(event.target as HTMLElement).closest("a")) return;
        event.preventDefault();
        setOpened(true);
      }}
    >
      <Products>
        <Suspense fallback={<ProductListSkeleton />}>
          <ProductList />
        </Suspense>
      </Products>
    </div>
  );
}

const meta = {
  id: "shop-product-detail",
  title: "쇼핑몰/상품 상세",
  component: Route,
  args: { productId: product.id },
  parameters: {
    layout: "fullscreen",
    nextjs: {
      appDirectory: true,
      navigation: { pathname: `/products/${product.id}` },
    },
  },
  tags: ["!autodocs"],
} satisfies Meta<typeof Route>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: "직접 진입",
  play: async ({ canvasElement }) => {
    await expect(
      await within(canvasElement).findByRole("heading", {
        name: product.name,
      }),
    ).toBeVisible();
  },
};

export const Loading: Story = {
  name: "목록 캐시 없는 소프트 내비",
  parameters: { apiMock: { mode: "loading" } },
};

export const Seeded: Story = {
  name: "목록에서 진입",
  // 상세 API 가 영원히 응답하지 않아도 목록 캐시의 seed 로 즉시 그려져야 한다. 목록 API 는 그대로 응답한다.
  beforeEach: () => {
    catalog.find.mockImplementation(() => new Promise(() => {}));
  },
  render: (args) => <FromList {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      await canvas.findByRole("link", { name: new RegExp(product.name) }),
    );
    await expect(
      await canvas.findByRole("heading", { name: product.name }),
    ).toBeVisible();
    // seed 가 그린 뒤 커밋에서 전체 상세를 다시 받기 시작한다(여기서는 응답이 오지 않는다).
    await waitFor(() => expect(catalog.find).toHaveBeenCalledWith(product.id));
  },
};

export const NotFound: Story = {
  name: "없는 상품",
  args: { productId: "0195aa00-0000-7000-8000-000000000000" },
  play: async ({ canvasElement }) => {
    await expect(
      await within(canvasElement).findByRole("heading", {
        name: "상품을 찾을 수 없습니다",
      }),
    ).toBeVisible();
  },
};
