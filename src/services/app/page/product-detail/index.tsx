"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCatalog } from "@/services/app/state/catalog";
import { siteText } from "@/lib/ui-text";
import { Button } from "@/lib/components/ui/button";
import { ProductNotFound } from "./not-found";
import { ProductActionBones, ProductSectionBones } from "./skeleton";

export { ProductDetailSkeleton } from "./skeleton";
export { ProductNotFound } from "./not-found";

/** 라우트 `products/[id]` 의 본문. course-detail 과 같은 구조: 라우트 파일은 정적, id 는 여기서 `useParams` 로 읽는다. */
export function ProductDetailRoute() {
  const { id } = useParams<{ id: string }>();
  return <ProductDetail productId={id} />;
}

// 빈 깡통. 파생 프로젝트에서 섹션 파일로 나눠 채운다(page.ai.md).
// 읽는 상태: useCatalog product(.suspend(productId)). 강의 상세(course-detail)와 같은 세 진입, 같은 `seed` 규칙:
//   - 직접 진입·새로고침·공유·봇: suspend → 같은 요청에서 SSR(SEO). 전체 필드(ProductView).
//   - 목록에서 소프트 내비: products 목록 항목(ProductSummary)이 seed 라 제목·가격·요약을 바로 그린다(`isPartial: true`).
//     상세 전용 영역(소개·파일·포함 강의·구매 여부)만 뼈대이고, 전체 응답이 오면 덮는다.
//   - 목록 데이터 없는 소프트 내비(묶음 강의 → 상품 등): 라우트의 ProductDetailSkeleton 뒤 클라에서 받는다.
// `data === null` 은 없는·비공개 상품. 파일은 이름·크기만 보여 준다. 다운로드는 구매 뒤 `/account/products` 에서 한다.
export default function ProductDetail({ productId }: { productId: string }) {
  const catalog = useCatalog((state) => ({
    product: state.product.suspend(productId),
    actions: state.actions,
  }));
  const product = catalog.product.data;
  if (!product) return <ProductNotFound />;
  const full = catalog.product.isPartial ? null : catalog.product.data;
  const bones = !full && !catalog.product.isError;

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-16">
      <p className="text-body-sm text-muted-foreground">
        {siteText.pages["product-detail"]}
      </p>
      <h1 className="mt-2 text-display-sm text-balance">{product.title}</h1>
      <p className="mt-2 text-body">
        {product.priceLabel}
        {product.originalPriceLabel ? (
          <span className="ml-2 text-muted-foreground line-through">
            {product.originalPriceLabel}
          </span>
        ) : null}
        {product.discountEndsLabel ? (
          <span className="ml-2 text-body-sm text-muted-foreground">
            {product.discountEndsLabel}
          </span>
        ) : null}
      </p>
      <p className="mt-1 text-body-sm text-muted-foreground">
        {product.kindLabel} · {product.categoryName ?? "—"} · 파일{" "}
        {product.fileCount}개
        {product.courseCount > 0 ? ` · 강의 ${product.courseCount}개` : ""}
        {product.downloadLimit !== null
          ? ` · 다운로드 ${product.downloadLimit}회`
          : ""}
        {" · "}구매 {product.purchaseCount}명
      </p>
      {product.summary ? (
        <p className="mt-4 text-body text-soft-foreground">{product.summary}</p>
      ) : null}

      <div className="mt-6">
        {full ? (
          full.purchase ? (
            <Button asChild>
              <Link href="/account/products">{siteText.pages["my-products"]}</Link>
            </Button>
          ) : (
            <Button asChild>
              <Link href={`/checkout/product/${product.id}`}>
                {product.isFree ? "무료로 받기" : siteText.pages["checkout"]}
              </Link>
            </Button>
          )
        ) : bones ? (
          <ProductActionBones />
        ) : (
          <p className="flex items-center gap-2 text-body-sm text-destructive">
            상세 정보를 불러오지 못했습니다.
            <Button
              variant="link"
              size="sm"
              onClick={() => catalog.actions.refreshProduct()}
            >
              다시 시도
            </Button>
          </p>
        )}
      </div>

      {full ? (
        full.description ? (
          <section className="mt-10">
            <h2 className="text-title-lg">상품 소개</h2>
            <div
              className="mt-2 text-body"
              dangerouslySetInnerHTML={{ __html: full.description }}
            />
          </section>
        ) : null
      ) : bones ? (
        <section className="mt-10">
          <h2 className="text-title-lg">상품 소개</h2>
          <ProductSectionBones />
        </section>
      ) : null}

      {full && full.files.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-title-lg">포함 파일</h2>
          <ul className="mt-2 flex flex-col gap-1 text-body">
            {full.files.map((file) => (
              <li key={file.id}>
                {file.name}{" "}
                <span className="text-body-sm text-muted-foreground">
                  {file.sizeLabel}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {full && full.courses.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-title-lg">포함 강의</h2>
          <ul className="mt-2 flex flex-col gap-1 text-body">
            {full.courses.map((course) => (
              <li key={course.id}>
                <Link href={`/courses/${course.id}`} className="underline">
                  {course.title}
                </Link>{" "}
                <span className="text-body-sm text-muted-foreground">
                  {course.lessonCount}개 레슨
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="mt-8 text-body-sm">
        <Link href="/products" className="underline">
          {siteText.pages["products"]}
        </Link>
      </p>
    </main>
  );
}
