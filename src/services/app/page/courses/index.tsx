"use client";

import Link from "next/link";
import { useCatalog } from "@/services/app/state/catalog";
import { siteText, courseText } from "@/lib/ui-text";
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

// 빈 깡통. 파생 프로젝트에서 섹션 파일로 나눠 채운다(page.ai.md).
// 읽는 상태: useCatalog list(.load — 필터·페이지는 모델의 filter/page), categories(.load). 카드 클릭 시 actions.open(course) 로 상세 캐시를 채운다.
const ALL = "all";
const SORTS = [
  { value: "latest", label: "최신순" },
  { value: "popular", label: "인기순" },
  { value: "rating", label: "평점순" },
  { value: "price_asc", label: "낮은 가격순" },
  { value: "price_desc", label: "높은 가격순" },
] as const;
export default function Courses() {
  const catalog = useCatalog((state) => ({
    list: state.list.load({
      filter: state.filter,
      pageable: { page: state.page, limit: 20 },
    }),
    filter: state.filter,
    categories: state.categories.load(),
    actions: state.actions,
  }));
  const list = catalog.list;

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-16">
      <h1 className="text-display-sm text-balance">
        {siteText.pages["courses"]}
      </h1>

      <div className="mt-6 flex flex-wrap gap-2">
        <Input
          placeholder={courseText.search}
          defaultValue={catalog.filter.search}
          onKeyDown={(event) => {
            if (event.key === "Enter")
              catalog.actions.setFilter({ search: event.currentTarget.value });
          }}
          className="w-60"
        />
        <Select
          value={catalog.filter.category || ALL}
          onValueChange={(value) =>
            catalog.actions.setFilter({ category: value === ALL ? "" : value })
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
          value={catalog.filter.sort}
          onValueChange={(value) =>
            catalog.actions.setFilter({
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
      ) : list.isLoading ? (
        <p className="mt-8 text-body text-muted-foreground">{courseText.loading}</p>
      ) : list.data.items.length === 0 ? (
        <EmptyState className="mt-8" title={courseText.empty} />
      ) : (
        <ul className="mt-8 flex flex-col gap-4">
          {list.data.items.map((course) => (
            <li key={course.id}>
              <Link
                href={`/courses/${course.id}`}
                onClick={() => catalog.actions.open(course)}
                className="block"
              >
                {course.thumbnail ? (
                  <img
                    src={course.thumbnail.thumb ?? course.thumbnail.url}
                    width={course.thumbnail.width}
                    height={course.thumbnail.height}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="h-32 w-auto"
                  />
                ) : null}
                <p className="text-title-md">{course.title}</p>
                <p className="text-body-sm text-soft-foreground">{course.summary}</p>
                <p className="text-body-sm text-muted-foreground">
                  {course.instructorName ?? "—"} · {course.levelLabel} ·{" "}
                  {course.totalDurationLabel} · {course.ratingLabel} (
                  {course.reviewCount})
                </p>
                <p className="text-body">
                  {course.priceLabel}
                  {course.originalPriceLabel ? (
                    <span className="ml-2 text-muted-foreground line-through">
                      {course.originalPriceLabel}
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
        onChange={(page) => catalog.actions.setPage(page)}
      />
    </main>
  );
}
