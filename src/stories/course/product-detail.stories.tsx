/* oxlint-disable custom/kebab-case-filename -- Storybook CSF convention. */
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Suspense } from "react";
import ProductDetail, {
  ProductDetailSkeleton,
} from "@/services/app/page/product-detail";
import { ProductList } from "@/services/app/page/products";
import { useCatalog } from "@/services/app/state/catalog";
import { catalog } from "../mocks/app-api/catalog";
import { bundle, product, purchase } from "../fixtures";

/** `/products/[id]` 라우트와 같은 경계: 스켈레톤 fallback. 없는 상품은 오류가 아니라 null 데이터라 화면이 안내한다. */
function Route({ productId }: { productId: string }) {
  return (
    <Suspense fallback={<ProductDetailSkeleton />}>
      <ProductDetail productId={productId} />
    </Suspense>
  );
}

/** 목록 → 상세. course-detail 스토리와 같은 구성: 숨긴 목록이 받아지면 첫 항목의 상세를 열고, 상세 API 는 대기시켜 seed 만으로 그린다. */
function FromListRoute() {
  const firstId = useCatalog(
    (state) => state.products.data.items[0]?.id ?? null,
  );
  return (
    <>
      <div hidden>
        <Suspense fallback={null}>
          <ProductList />
        </Suspense>
      </div>
      {firstId ? <Route productId={firstId} /> : <ProductDetailSkeleton />}
    </>
  );
}

const MISSING_ID = "00000000-0000-4000-8000-000000000000";

const meta = {
  id: "product-detail",
  title: "강의/상품 상세",
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
  name: "파일 상품",
  parameters: { apiMock: { data: { purchases: [] } } },
};

export const Bundle: Story = {
  name: "강의 묶음",
  args: { productId: bundle.id },
  parameters: {
    nextjs: { appDirectory: true, navigation: { pathname: `/products/${bundle.id}` } },
  },
};

export const Purchased: Story = {
  name: "구매한 상품",
  parameters: { apiMock: { data: { purchases: [purchase] } } },
};

export const FromList: Story = {
  name: "목록에서 진입",
  render: () => <FromListRoute />,
  parameters: { apiMock: { data: { purchases: [] } } },
  beforeEach: () => {
    catalog.product.mockImplementation(() => new Promise(() => {}));
  },
};

export const Loading: Story = {
  name: "로딩",
  parameters: { apiMock: { mode: "loading" } },
};

export const NotFound: Story = {
  name: "없는 상품",
  args: { productId: MISSING_ID },
  parameters: {
    nextjs: { appDirectory: true, navigation: { pathname: `/products/${MISSING_ID}` } },
  },
};
