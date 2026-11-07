import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { entityId } from "@/lib/course";
import { siteText } from "@/lib/ui-text";
import { presentProduct } from "@/server/course";
import { CourseError, productRepository } from "@/server/repository";
import {
  ProductDetailRoute,
  ProductDetailSkeleton,
} from "@/services/app/page/product-detail";

type Params = Promise<{ id: string }>;

// 상품 상세의 유일한 라우트. 강의 상세(courses/[id])와 같은 구조: 본문은 정적, 서버 조회는 generateMetadata 하나.
// 화면은 ProductDetail 의 `.suspend(id)` 가 읽고(직접 진입 SSR, 목록에서 들어오면 seed), 없는 상품은 null(noindex).
async function findProduct(id: string) {
  if (!entityId.safeParse(id).success) return null;
  try {
    return presentProduct(await productRepository.findById(id, true));
  } catch (error) {
    if (error instanceof CourseError && error.code === "NOT_FOUND") return null;
    throw error;
  }
}

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

export default function Page() {
  return (
    <>
      <Suspense fallback={<ProductDetailSkeleton />}>
        <ProductDetailRoute />
      </Suspense>
      <Suspense>
        <Connection />
      </Suspense>
    </>
  );
}

/** 동적 마커. metadata 는 요청 시점에 만들고 본문은 정적 셸로 남긴다. */
async function Connection() {
  await connection();
  return null;
}
