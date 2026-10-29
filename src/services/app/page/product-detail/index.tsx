"use client";

import Link from "next/link";
import { useCatalog } from "@/services/app/state/catalog";
import { siteText } from "@/lib/ui-text";
import { Button } from "@/lib/components/ui/button";
import { ProductNotFound } from "./not-found";

export { ProductDetailSkeleton } from "./skeleton";
export { ProductNotFound } from "./not-found";

// 빈 깡통. 파생 프로젝트에서 섹션 파일로 나눠 채운다(page.ai.md).
// 읽는 상태: useCatalog product(.suspend(productId)).
//   - 직접 진입·새로고침·공유·봇: 정식 라우트 `products/[id]` 가 404 판단·metadata 뒤 같은 요청에서 SSR(SEO).
//   - 카드 소프트 내비: 카드의 `actions.openProduct(product)` 이 채운 캐시를 그대로 그리고 커밋 뒤 재조회가 파일·구매 여부를 채운다.
// 파일은 이름·크기만 보여 준다. 다운로드는 구매 뒤 `/account/products` 에서 한다.
export default function ProductDetail({ productId }: { productId: string }) {
  const catalog = useCatalog((state) => ({
    product: state.product.suspend(productId),
    actions: state.actions,
  }));
  const product = catalog.product.data;

  // 목록 캐시에 남은 비공개 상품은 재조회가 NOT_FOUND 를 돌려주므로 데이터보다 오류를 먼저 본다.
  if (catalog.product.isError || !product) return <ProductNotFound />;

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
        {product.purchase ? (
          <Button asChild>
            <Link href="/account/products">{siteText.pages["my-products"]}</Link>
          </Button>
        ) : (
          <Button asChild>
            <Link href={`/checkout/product/${product.id}`}>
              {product.isFree ? "무료로 받기" : siteText.pages["checkout"]}
            </Link>
          </Button>
        )}
      </div>

      {product.description ? (
        <section className="mt-10">
          <h2 className="text-title-lg">상품 소개</h2>
          <div
            className="mt-2 text-body"
            dangerouslySetInnerHTML={{ __html: product.description }}
          />
        </section>
      ) : null}

      {product.files.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-title-lg">포함 파일</h2>
          <ul className="mt-2 flex flex-col gap-1 text-body">
            {product.files.map((file) => (
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

      {product.courses.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-title-lg">포함 강의</h2>
          <ul className="mt-2 flex flex-col gap-1 text-body">
            {product.courses.map((course) => (
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
