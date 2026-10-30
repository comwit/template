"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useCatalog } from "@/services/app/state/catalog";
import { siteText } from "@/lib/ui-text";
import { Button } from "@/lib/components/ui/button";
import { ProductNotFound } from "./not-found";
import { ProductActionBones, ProductSectionBones } from "./skeleton";

export { ProductDetailSkeleton } from "./skeleton";
export { ProductNotFound } from "./not-found";

// 빈 깡통. 파생 프로젝트에서 섹션 파일로 나눠 채운다(page.ai.md).
// 읽는 상태: useCatalog product(.suspend(productId)). 강의 상세(course-detail)와 같은 세 진입:
//   - 직접 진입·새로고침·공유·봇: 정식 라우트 `products/[id]` 가 404 판단·metadata 뒤 같은 요청에서 SSR(SEO).
//   - 카드 소프트 내비: `(.)products/[id]` 인터셉트 라우트. 카드의 `actions.openProduct(product)` 이 넣은 목록 항목으로
//     제목·가격·요약을 바로 그리고, 상세 전용 필드(소개·파일·포함 강의·구매 여부)는 `undefined` 인 동안 그 자리만 뼈대.
//   - 캐시 없는 소프트 내비(묶음 강의 → 상품 등): 라우트의 ProductDetailSkeleton 뒤 클라에서 받는다.
// 파일은 이름·크기만 보여 준다. 다운로드는 구매 뒤 `/account/products` 에서 한다.
export default function ProductDetail({ productId }: { productId: string }) {
  const catalog = useCatalog((state) => ({
    product: state.product.suspend(productId),
    actions: state.actions,
  }));
  const product = catalog.product.data;

  // 인터셉트 라우트에는 metadata 가 없어 탭 제목이 레이아웃 기본값으로 남는다. 정식 라우트의
  // generateMetadata 가 이미 상품명을 넣은 경우(직접 진입)는 건드리지 않는다.
  useEffect(() => {
    if (!product) return;
    const apply = () => {
      if (
        location.pathname.endsWith(product.id) &&
        !document.title.includes(product.title)
      )
        document.title = product.title;
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.head, {
      subtree: true,
      childList: true,
      characterData: true,
    });
    return () => observer.disconnect();
  }, [product]);

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
        {product.purchase === undefined ? (
          <ProductActionBones />
        ) : product.purchase ? (
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

      {product.description === undefined ? (
        <section className="mt-10">
          <h2 className="text-title-lg">상품 소개</h2>
          <ProductSectionBones />
        </section>
      ) : product.description ? (
        <section className="mt-10">
          <h2 className="text-title-lg">상품 소개</h2>
          <div
            className="mt-2 text-body"
            dangerouslySetInnerHTML={{ __html: product.description }}
          />
        </section>
      ) : null}

      {product.files && product.files.length > 0 ? (
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

      {product.courses && product.courses.length > 0 ? (
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
