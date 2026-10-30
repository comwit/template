"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useCatalog } from "@/services/app/state/catalog";
import type { ProductFilter } from "@/lib/course";
import { courseText } from "@/lib/ui-text";
import { Input } from "@/lib/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/lib/components/ui/select";
import { Pager } from "@/lib/components/ui/pager";
import { EmptyState } from "@/lib/components/ui/empty-state";
import { cn } from "@/lib/utils/cn";

// 읽는 상태: useCatalog products(.suspend — 필터·페이지는 모델의 productFilter/productPage), categories(.suspend).
// CourseList 와 같은 규칙: 직접 진입은 SSR, 다시 돌아오면 캐시로 바로, 필터·페이지 변경은 transition 으로 지금 목록 유지.
// 카드 클릭 시 actions.openProduct(product) 로 상세 리소스를 목록 항목으로 채운다 → 인터셉트 라우트가 바로 그린다.
const ALL = "all";
const KINDS = [
  { value: "file", label: "파일" },
  { value: "bundle", label: "강의 묶음" },
] as const;
const SORTS = [
  { value: "latest", label: "최신순" },
  { value: "popular", label: "인기순" },
  { value: "price_asc", label: "낮은 가격순" },
  { value: "price_desc", label: "높은 가격순" },
] as const;

export function ProductList() {
  const [pending, startTransition] = useTransition();
  const catalog = useCatalog((state) => ({
    list: state.products.suspend({
      filter: state.productFilter,
      pageable: { page: state.productPage, limit: 20 },
    }),
    filter: state.productFilter,
    categories: state.categories.suspend(),
    actions: state.actions,
  }));
  const list = catalog.list;
  const change = (filter: Partial<ProductFilter>) =>
    startTransition(() => catalog.actions.setProductFilter(filter));

  return (
    <>

      <div className="mt-6 flex flex-wrap gap-2">
        <Input
          placeholder={courseText.search}
          defaultValue={catalog.filter.search}
          onKeyDown={(event) => {
            if (event.key === "Enter")
              change({
                search: event.currentTarget.value,
              });
          }}
          className="w-60"
        />
        <Select
          value={catalog.filter.category || ALL}
          onValueChange={(value) =>
            change({
              category: value === ALL ? "" : value,
            })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder={courseText.all} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{courseText.all}</SelectItem>
            {catalog.categories.data.map((category) => (
              <SelectItem key={category.id} value={category.slug}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={catalog.filter.kind || ALL}
          onValueChange={(value) =>
            change({
              kind: value === ALL ? "" : value,
            })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder={courseText.all} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{courseText.all}</SelectItem>
            {KINDS.map((kind) => (
              <SelectItem key={kind.value} value={kind.value}>
                {kind.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={catalog.filter.sort}
          onValueChange={(value) =>
            change({
              sort: value as (typeof SORTS)[number]["value"],
            })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORTS.map((sort) => (
              <SelectItem key={sort.value} value={sort.value}>
                {sort.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {list.isError ? (
        <p className="mt-8 text-body text-destructive">{list.error}</p>
      ) : list.data.items.length === 0 ? (
        <EmptyState className="mt-8" title={courseText.empty} />
      ) : (
        <ul
          aria-busy={pending}
          className={cn("mt-8 flex flex-col gap-4", pending && "opacity-60")}>
          {list.data.items.map((product) => (
            <li key={product.id}>
              <Link
                href={`/products/${product.id}`}
                onClick={() => catalog.actions.openProduct(product)}
                className="block"
              >
                {product.thumbnail ? (
                  <img
                    src={product.thumbnail.thumb ?? product.thumbnail.url}
                    width={product.thumbnail.width}
                    height={product.thumbnail.height}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="h-32 w-auto"
                  />
                ) : null}
                <p className="text-title-md">{product.title}</p>
                <p className="text-body-sm text-soft-foreground">{product.summary}</p>
                <p className="text-body-sm text-muted-foreground">
                  {product.kindLabel} · {product.categoryName ?? "—"} · 파일{" "}
                  {product.fileCount}개
                  {product.courseCount > 0 ? ` · 강의 ${product.courseCount}개` : ""}
                </p>
                <p className="text-body">
                  {product.priceLabel}
                  {product.originalPriceLabel ? (
                    <span className="ml-2 text-muted-foreground line-through">
                      {product.originalPriceLabel}
                    </span>
                  ) : null}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Pager
        page={list.data.page}
        totalPages={list.data.totalPages}
        onChange={(page) => startTransition(() => catalog.actions.setProductPage(page))}
      />
    </>
  );
}
