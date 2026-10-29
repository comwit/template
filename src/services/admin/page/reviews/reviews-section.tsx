"use client";
import { MessageSquareReply, Eye, EyeOff, Star } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { AdminPage, AdminPageHeader } from "@/services/admin/_components";
import {
  DateValue,
  IconAction,
  CourseTable,
  CourseToolbar,
  FilterSelect,
  StatusBadge,
  ReferenceValue,
  type ListQuery,
} from "@/services/admin/_components/course";
import { courseText } from "@/lib/ui-text";
import type { ListFilter, ReviewView } from "@/lib/course";
function Rating({ value }: { value: number }) {
  return (
    <span
      className="inline-flex items-center gap-0.5 text-warning-surface-foreground"
      aria-label={`별점 ${value}점`}
      title={`${value}점`}
    >
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`size-3.5 ${i < value ? "fill-current" : "opacity-30"}`}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}
export function ReviewsSection(props: {
  query: ListQuery<ReviewView>;
  filter: ListFilter;
  busy?: boolean;
  onFilter(filter: Partial<ListFilter>): void;
  onPage(page: number): void;
  onRefresh(): void;
  onReply(id: string): void;
  onVisibility(id: string, hidden: boolean): void;
}) {
  const columns: ColumnDef<ReviewView>[] = [
    {
      accessorKey: "courseTitle",
      header: "강의",
      cell: ({ row }) => (
        <div className="max-w-56">
          <p className="truncate text-body-sm font-semibold">
            {row.original.courseTitle}
          </p>
          <p className="truncate text-caption text-muted-foreground">
            {row.original.userName}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "rating",
      header: "별점",
      cell: ({ row }) => <Rating value={row.original.rating} />,
    },
    {
      accessorKey: "content",
      header: "내용",
      cell: ({ row }) => (
        <div className="max-w-72 [&_button]:font-sans">
          <ReferenceValue value={row.original.content}>
            {row.original.content}
          </ReferenceValue>
          {row.original.adminReply ? (
            <p className="flex items-center gap-1 text-caption text-muted-foreground">
              <MessageSquareReply className="size-3" aria-hidden="true" />
              답글 {row.original.adminRepliedLabel}
            </p>
          ) : null}
        </div>
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
      accessorKey: "createdLabel",
      header: "작성일",
      cell: ({ row }) => <DateValue value={row.original.createdLabel} />,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <IconAction
            icon={MessageSquareReply}
            label={row.original.adminReply ? "답글 수정" : "답글"}
            onClick={() => props.onReply(row.original.id)}
            disabled={props.busy}
          />
          <IconAction
            icon={row.original.status === "visible" ? EyeOff : Eye}
            label={row.original.status === "visible" ? "숨김" : "공개"}
            onClick={() =>
              props.onVisibility(
                row.original.id,
                row.original.status === "visible",
              )
            }
            disabled={props.busy}
          />
        </div>
      ),
    },
  ];
  return (
    <AdminPage width="6xl">
      <AdminPageHeader title={courseText.reviews} />
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
                { value: "visible", label: "공개" },
                { value: "hidden", label: "숨김" },
              ]}
            />
          </CourseToolbar>
        }
      />
    </AdminPage>
  );
}
