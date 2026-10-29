import { Suspense, cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { entityId } from "@/lib/course";
import { siteText } from "@/lib/ui-text";
import { presentProduct } from "@/server/course";
import { CourseError, productRepository } from "@/server/repository";
import ProductDetail, {
  ProductDetailSkeleton,
} from "@/services/app/page/product-detail";

type Params = Promise<{ id: string }>;

// 강의 상세와 같은 구조: 404·metadata 는 RSC 에서 한 번, 화면은 ProductDetail 의 `.suspend(id)` 가 SSR.
const findProduct = cache(async (id: string) => {
  if (!entityId.safeParse(id).success) return null;
  try {
    return presentProduct(await productRepository.findById(id, true));
  } catch (error) {
    if (error instanceof CourseError && error.code === "NOT_FOUND") return null;
    throw error;
  }
});

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { id } = await params;
  const product = await findProduct(id);
  if (!product)
    return {
      title: siteText.pages["product-detail"],
      robots: { index: false, follow: false },
    };
  const description = product.summary.slice(0, 160) || undefined;
  const image = product.thumbnail;
  return {
    title: product.title,
    description,
    openGraph: {
      title: product.title,
      description,
      images: image
        ? [{ url: image.url, width: image.width, height: image.height }]
        : undefined,
    },
  };
}

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
