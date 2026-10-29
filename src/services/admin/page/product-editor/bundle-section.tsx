"use client";
import { Checkbox } from "@/lib/components/ui/checkbox";
import { EmptyState } from "@/lib/components/ui/empty-state";
import { AdminSection } from "@/services/admin/_components";
import type { CourseSummary } from "@/services/admin/state/products";
/** 묶음에 넣을 공개 강의. 하나라도 고르면 상품 종류가 '강의 묶음'이 된다. */
export function BundleSection(props: {
  courses: CourseSummary[];
  selected: string[];
  busy: boolean;
  onChange(ids: string[]): void;
}) {
  const toggle = (id: string, checked: boolean) => {
    if (checked) {
      if (!props.selected.includes(id)) props.onChange([...props.selected, id]);
    } else props.onChange(props.selected.filter((c) => c !== id));
  };
  return (
    <AdminSection
      title="묶음 강의"
      meta={props.selected.length ? `${props.selected.length}개 선택` : undefined}
      description="구매자에게 함께 열어줄 강의를 고릅니다. 고르면 종류가 강의 묶음으로 바뀝니다."
    >
      {props.courses.length === 0 ? (
        <EmptyState
          title="공개된 강의가 없습니다"
          description="강의를 먼저 공개해야 묶음에 넣을 수 있습니다."
        />
      ) : (
        <ul className="grid gap-1 sm:grid-cols-2">
          {props.courses.map((course) => {
            const checked = props.selected.includes(course.id);
            return (
              <li key={course.id}>
                <label className="flex cursor-pointer items-center gap-3 rounded-control px-2 py-1.5 hover:bg-accent">
                  <Checkbox
                    checked={checked}
                    disabled={props.busy}
                    aria-label={course.title}
                    onCheckedChange={(next) => toggle(course.id, next)}
                  />
                  {course.thumbnail ? (
                    <img
                      className="h-8 w-12 shrink-0 rounded-control object-cover"
                      src={course.thumbnail.thumb ?? course.thumbnail.url}
                      width={48}
                      height={32}
                      loading="lazy"
                      decoding="async"
                      alt=""
                    />
                  ) : (
                    <span className="h-8 w-12 shrink-0 rounded-control bg-muted" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body-sm font-medium">
                      {course.title}
                    </span>
                    <span className="block text-caption text-muted-foreground">
                      레슨 {course.lessonCount} · {course.priceLabel}
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </AdminSection>
  );
}
