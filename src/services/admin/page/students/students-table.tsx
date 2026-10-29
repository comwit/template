"use client";
import { BadgeCheck } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  DateValue,
  NumberValue,
  CourseTable,
  CourseToolbar,
  type ListQuery,
} from "@/services/admin/_components/course";
import type { ListFilter, StudentView } from "@/services/admin/state/students";
export function StudentsTable(props: {
  query: ListQuery<StudentView>;
  filter: ListFilter;
  onFilter(filter: Partial<ListFilter>): void;
  onPage(page: number): void;
  onRefresh(): void;
}) {
  const columns: ColumnDef<StudentView>[] = [
    {
      accessorKey: "name",
      header: "회원",
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="flex items-center gap-1 font-medium">
            <span className="max-w-56 truncate">{row.original.name || "—"}</span>
            {row.original.emailVerified ? (
              <BadgeCheck
                className="size-4 shrink-0 text-primary"
                aria-label="이메일 인증됨"
              />
            ) : null}
          </p>
          <p className="max-w-64 truncate text-caption text-muted-foreground">
            {row.original.email}
          </p>
        </div>
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
      accessorKey: "completedCount",
      header: () => <div className="text-right">수료</div>,
      cell: ({ row }) => (
        <NumberValue>
          {row.original.completedCount.toLocaleString("ko-KR")}
        </NumberValue>
      ),
    },
    {
      accessorKey: "createdLabel",
      header: "가입일",
      cell: ({ row }) => <DateValue value={row.original.createdLabel} />,
    },
  ];
  return (
    <CourseTable
      query={props.query}
      columns={columns}
      onPageChange={props.onPage}
      toolbar={
        <CourseToolbar
          search={props.filter.search}
          onSearch={(search) => props.onFilter({ search })}
          onRefresh={props.onRefresh}
        />
      }
    />
  );
}
