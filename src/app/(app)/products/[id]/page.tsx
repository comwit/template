import { Suspense, cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { entityId } from "@/lib/commerce";
import { storefrontText } from "@/lib/ui-text";
import { presentProduct } from "@/server/commerce";
import { CommerceError, catalogRepository } from "@/server/repository";
import ProductDetail, {
  ProductDetailSkeleton,
} from "@/services/app/page/product-detail";

type Params = Promise<{ id: string }>;

// 정식 라우트. 직접 진입·새로고침·공유 링크·봇만 여기로 온다 — 앱 안 소프트 내비는 `(.)products/[id]` 인터셉트가 잡는다.
// 404 판단·metadata 용 RSC 조회는 한 요청에 한 번(React cache). 화면 데이터는 ProductDetail 의 `.suspend(id)` 가
// 같은 요청에서 SSR 한다. 잘못된 id·없는·비공개 상품(NOT_FOUND)만 null, 다른 오류는 그대로 던진다.
const findProduct = cache(async (id: string) => {
  if (!entityId.safeParse(id).success) return null;
  try {
    return presentProduct(await catalogRepository.findById(id, true));
  } catch (error) {
    if (error instanceof CommerceError && error.code === "NOT_FOUND")
      return null;
    throw error;
  }
});

// 공유 미리보기는 상품명·소개 첫 문단·첫 사진. seo-optimize 스킬이 buildMetadata·JSON-LD 로 확장한다.
export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { id } = await params;
  const product = await findProduct(id);
  if (!product)
    return {
      title: storefrontText.pages["product-detail"],
      robots: { index: false, follow: false },
    };
  const description =
    product.description.split(/\n{2,}/)[0]?.slice(0, 160) || undefined;
  const image = product.images[0];
  return {
    title: product.name,
    description,
    openGraph: {
      title: product.name,
      description,
      images: image
        ? [{ url: image.url, width: image.width, height: image.height }]
        : undefined,
    },
  };
}

// URL 데이터(params)는 Suspense 아래에서 읽어야 App Shell 이 즉시 뜬다. fallback 은 null 이 아니라 뼈대다.
export default function Page({ params }: { params: Params }) {
  return (
    <Suspense fallback={<ProductDetailSkeleton />}>
      <ProductDetailRoute params={params} />
    </Suspense>
  );
}

async function ProductDetailRoute({ params }: { params: Params }) {
  const { id } = await params;
  if (!(await findProduct(id))) notFound();
  return <ProductDetail productId={id} />;
}
