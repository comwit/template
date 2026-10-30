"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useCatalog } from "@/services/app/state/catalog";
import type { CourseFilter } from "@/lib/course";
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

// 읽는 상태: useCatalog list(.suspend — 필터·페이지는 모델의 filter/page), categories(.suspend).
// 둘 다 `.suspend()` 라 직접 진입·봇은 같은 요청에서 SSR 된 목록을 받는다(SEO). 다른 화면에 갔다가 돌아오면
// 같은 인자의 캐시가 있어 기다리지 않고 바로 그리고, 커밋 뒤 백그라운드로 다시 받는다.
// 필터·페이지 변경은 transition 안에서 바꿔 새 목록이 올 때까지 지금 목록을 흐리게 유지한다(스켈레톤으로 돌아가지 않음).
// 카드 클릭 시 actions.open(course) 로 상세 리소스를 목록 항목으로 채운다 → 인터셉트 라우트가 바로 그린다.
const ALL = "all";
const SORTS = [
  { value: "latest", label: "최신순" },
  { value: "popular", label: "인기순" },
  { value: "rating", label: "평점순" },
  { value: "price_asc", label: "낮은 가격순" },
  { value: "price_desc", label: "높은 가격순" },
] as const;

export function CourseList() {
  const [pending, startTransition] = useTransition();
  const catalog = useCatalog((state) => ({
    list: state.list.suspend({
      filter: state.filter,
      pageable: { page: state.page, limit: 20 },
    }),
    filter: state.filter,
    categories: state.categories.suspend(),
    actions: state.actions,
  }));
  const list = catalog.list;
  const change = (filter: Partial<CourseFilter>) =>
    startTransition(() => catalog.actions.setFilter(filter));

  return (
    <>
      <div className="mt-6 flex flex-wrap gap-2">
        <Input
          placeholder={courseText.search}
          defaultValue={catalog.filter.search}
          onKeyDown={(event) => {
            if (event.key === "Enter") change({ search: event.currentTarget.value });
          }}
          className="w-60"
        />
        <Select
          value={catalog.filter.category || ALL}
          onValueChange={(value) => change({ category: value === ALL ? "" : value })}
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
            change({ sort: value as (typeof SORTS)[number]["value"] })
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
          className={cn("mt-8 flex flex-col gap-4", pending && "opacity-60")}
        >
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
        onChange={(page) => startTransition(() => catalog.actions.setPage(page))}
      />
    </>
  );
}
