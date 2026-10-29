"use client";
import Link from "next/link";
import { Archive, Plus, Tags, UserRound } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/lib/components/ui/button";
import { AdminPage, AdminPageHeader } from "@/services/admin/_components";
import {
  NumberValue,
  IconAction,
  CourseTable,
  CourseToolbar,
  FilterSelect,
  StatusBadge,
  type ListQuery,
} from "@/services/admin/_components/course";
import type { ListFilter, CourseSummary } from "@/services/admin/state/courses";
import { adminRoutes } from "@/lib/admin-routes";
import { courseText } from "@/lib/ui-text";
export type CoursesSectionProps = {
  query: ListQuery<CourseSummary>;
  filter: ListFilter;
  busy?: boolean;
  onFilter(filter: Partial<ListFilter>): void;
  onPage(page: number): void;
  onRefresh(): void;
  onCreate(): void;
  onArchive(id: string): void;
  onCategories(): void;
  onInstructors(): void;
};
export function CoursesSection(props: CoursesSectionProps) {
  const columns: ColumnDef<CourseSummary>[] = [
    {
      accessorKey: "title",
      header: "강의",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          {row.original.thumbnail ? (
            <img
              className="h-10 w-16 shrink-0 rounded-control object-cover"
              src={row.original.thumbnail.thumb ?? row.original.thumbnail.url}
              width={64}
              height={40}
              loading="lazy"
              decoding="async"
              alt=""
            />
          ) : (
            <span className="h-10 w-16 shrink-0 rounded-control bg-muted" />
          )}
          <div className="min-w-0">
            <Link
              href={adminRoutes.courseEditor(row.original.id)}
              className="block max-w-72 truncate font-medium hover:underline"
              title={row.original.title}
            >
              {row.original.title}
            </Link>
            <p className="max-w-72 truncate font-mono text-caption text-muted-foreground">
              {row.original.slug}
            </p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "categoryName",
      header: "분류",
      cell: ({ row }) => (
        <div className="whitespace-nowrap text-body-sm">
          <p>{row.original.categoryName ?? "미분류"}</p>
          <p className="text-caption text-muted-foreground">
            {row.original.levelLabel}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "priceLabel",
      header: () => <div className="text-right">가격</div>,
      cell: ({ row }) => (
        <NumberValue>
          {row.original.originalPriceLabel ? (
            <span className="mr-1.5 font-normal text-muted-foreground line-through">
              {row.original.originalPriceLabel}
            </span>
          ) : null}
          {row.original.priceLabel}
        </NumberValue>
      ),
    },
    {
      accessorKey: "status",
      header: "상태",
      cell: ({ row }) => (
        <StatusBadge
          status={row.original.status}
          label={row.original.statusLabel}
        />
      ),
    },
    {
      accessorKey: "lessonCount",
      header: () => <div className="text-right">레슨</div>,
      cell: ({ row }) => (
        <NumberValue>
          {row.original.lessonCount.toLocaleString("ko-KR")}
          <span className="block text-caption font-normal text-muted-foreground">
            {row.original.totalDurationLabel}
          </span>
        </NumberValue>
      ),
    },
    {
      accessorKey: "enrollmentCount",
      header: () => <div className="text-right">수강</div>,
      cell: ({ row }) => (
        <NumberValue>
          {row.original.enrollmentCount.toLocaleString("ko-KR")}
        </NumberValue>
      ),
    },
    {
      accessorKey: "ratingLabel",
      header: () => <div className="text-right">평점</div>,
      cell: ({ row }) => <NumberValue>{row.original.ratingLabel}</NumberValue>,
    },
    {
      id: "actions",
      header: "관리",
      cell: ({ row }) => (
        <IconAction
          icon={Archive}
          label={`${row.original.title} 보관`}
          onClick={() => props.onArchive(row.original.id)}
          disabled={props.busy || row.original.status === "archived"}
        />
      ),
    },
  ];
  return (
    <AdminPage width="6xl">
      <AdminPageHeader
        title={courseText.courses}
        action={
          <div className="flex gap-2">
            <IconAction
              icon={Tags}
              label="카테고리 관리"
              onClick={props.onCategories}
              variant="outline"
            />
            <IconAction
              icon={UserRound}
              label="강사 관리"
              onClick={props.onInstructors}
              variant="outline"
            />
            <Button onClick={props.onCreate}>
              <Plus className="size-4" aria-hidden="true" />
              {courseText.addCourse}
            </Button>
          </div>
        }
      />
      <CourseTable
        query={props.query}
        columns={columns}
        onPageChange={props.onPage}
        toolbar={
          <CourseToolbar
            search={props.filter.search}
            onSearch={(search) => props.onFilter({ search })}
            onRefresh={props.onRefresh}
          >
            <FilterSelect
              value={props.filter.status}
              onChange={(status) => props.onFilter({ status })}
              options={[
                { value: "draft", label: "초안" },
                { value: "published", label: "공개" },
                { value: "archived", label: "보관" },
              ]}
            />
          </CourseToolbar>
        }
      />
    </AdminPage>
  );
}
