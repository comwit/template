import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { entityId } from "@/lib/commerce";
import { storefrontText } from "@/lib/ui-text";
import { presentProduct } from "@/server/commerce";
import { CommerceError, catalogRepository } from "@/server/repository";
import { ProductDetailSkeleton } from "@/services/app/page/product-detail";
import { ProductDetailRoute } from "@/services/app/page/product-detail/route";

type Params = Promise<{ id: string }>;

// 상품 상세의 유일한 라우트. 직접 진입·새로고침·공유 링크·봇과 앱 안 소프트 내비가 모두 여기로 온다.
// 본문은 정적이다: 서버 조회는 generateMetadata 하나뿐이고, 화면 데이터는 ProductDetailRoute 가 클라에서 id 를 읽어
// useCatalog detail 을 `.suspend(id)` 한다 — 직접 진입은 같은 요청에서 SSR(SEO), 목록에서 넘어오면 모델의 seed 로 바로 그린다.
// 본문에서 params 나 데이터를 await 하면 동적 구멍이 생겨 소프트 내비마다 서버를 기다리게 된다(src/app/.ai.md → Data routes).

// metadata 용 조회. 잘못된 id·없는·비공개 상품(NOT_FOUND)만 null, 다른 오류는 그대로 던진다.
async function findProduct(id: string) {
  if (!entityId.safeParse(id).success) return null;
  try {
    return presentProduct(await catalogRepository.findById(id, true));
  } catch (error) {
    if (error instanceof CommerceError && error.code === "NOT_FOUND")
      return null;
    throw error;
  }
}

// 공유 미리보기는 상품명·소개 첫 문단·첫 사진. 없는 상품은 noindex. seo-optimize 스킬이 buildMetadata·JSON-LD 로 확장한다.
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

export default function Page() {
  return (
    <>
      <Suspense fallback={<ProductDetailSkeleton />}>
        <ProductDetailRoute />
      </Suspense>
      {/* 동적 표시. metadata 는 요청 시점에 만들고 본문은 정적으로 남긴다. */}
      <Suspense>
        <Connection />
      </Suspense>
    </>
  );
}

async function Connection() {
  await connection();
  return null;
}
