/* oxlint-disable custom/kebab-case-filename -- Storybook CSF convention. */
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  Component,
  Suspense,
  useLayoutEffect,
  useState,
  type ReactNode,
} from "react";
import { expect, within } from "storybook/test";
import ProductDetail, {
  ProductDetailSkeleton,
  ProductNotFound,
} from "@/services/app/page/product-detail";
import { useCatalog } from "@/services/app/state/catalog";
import { product } from "../fixtures";

/** 인터셉트 라우트의 `error.tsx` 와 같은 역할 — `.suspend()` 가 던진 오류를 안내 화면으로 받는다. */
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

/** 라우트 두 곳(정식·인터셉트)과 같은 경계: 스켈레톤 fallback + 오류 경계. */
function Route({ productId }: { productId: string }) {
  return (
    <RouteErrorBoundary>
      <Suspense fallback={<ProductDetailSkeleton />}>
        <ProductDetail productId={productId} />
      </Suspense>
    </RouteErrorBoundary>
  );
}

/** 카드 클릭이 하는 일(`actions.open`)을 흉내 낸다 — detail 캐시를 먼저 채우고 나서 화면을 그린다. */
function SeedFromCard({ children }: { children: ReactNode }) {
  const catalog = useCatalog((state) => ({ actions: state.actions }));
  const [ready, setReady] = useState(false);
  useLayoutEffect(() => {
    catalog.actions.open(product);
    setReady(true);
  }, [catalog.actions]);
  return ready ? children : null;
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

export const Default: Story = { name: "직접 진입" };

export const Loading: Story = {
  name: "캐시 없는 소프트 내비",
  parameters: { apiMock: { mode: "loading" } },
};

export const Seeded: Story = {
  name: "목록에서 진입",
  // API 가 영원히 응답하지 않아도(loading) 카드가 채운 캐시로 즉시 그려져야 한다.
  parameters: { apiMock: { mode: "loading" } },
  decorators: [
    (Story) => (
      <SeedFromCard>
        <Story />
      </SeedFromCard>
    ),
  ],
  play: async ({ canvasElement }) => {
    await expect(
      await within(canvasElement).findByRole("heading", {
        name: product.name,
      }),
    ).toBeVisible();
  },
};

export const NotFound: Story = {
  name: "없는 상품",
  parameters: { apiMock: { mode: "error" } },
};
