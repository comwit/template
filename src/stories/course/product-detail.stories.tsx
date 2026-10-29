/* oxlint-disable custom/kebab-case-filename -- Storybook CSF convention. */
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Component, Suspense, type ReactNode } from "react";
import ProductDetail, {
  ProductDetailSkeleton,
  ProductNotFound,
} from "@/services/app/page/product-detail";
import { bundle, product, purchase } from "../fixtures";

/** 라우트의 `error.tsx`·notFound 와 같은 역할 — `.suspend()` 가 던진 오류를 안내 화면으로 받는다. */
class RouteErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <ProductNotFound /> : this.props.children;
  }
}

/** `/products/[id]` 라우트와 같은 경계: 스켈레톤 fallback + 오류 경계. */
function Route({ productId }: { productId: string }) {
  return (
    <RouteErrorBoundary>
      <Suspense fallback={<ProductDetailSkeleton />}>
        <ProductDetail productId={productId} />
      </Suspense>
    </RouteErrorBoundary>
  );
}

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

export const Loading: Story = {
  name: "로딩",
  parameters: { apiMock: { mode: "loading" } },
};

export const NotFound: Story = {
  name: "없는 상품",
  parameters: { apiMock: { mode: "error" } },
};
