"use client";
import { Award, ListChecks, Ban } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  DateValue,
  IconAction,
  CourseTable,
  CourseToolbar,
  FilterSelect,
  StatusBadge,
  type ListQuery,
} from "@/services/admin/_components/course";
import type {
  EnrollmentFilter,
  EnrollmentView,
  CourseSummary,
} from "@/services/admin/state/students";
export function EnrollmentsTable(props: {
  query: ListQuery<EnrollmentView>;
  filter: EnrollmentFilter;
  courses: CourseSummary[];
  busy: boolean;
  onFilter(filter: Partial<EnrollmentFilter>): void;
  onPage(page: number): void;
  onRefresh(): void;
  onProgress(id: string): void;
  onRevoke(enrollment: EnrollmentView): void;
}) {
  const columns: ColumnDef<EnrollmentView>[] = [
    {
      accessorKey: "userEmail",
      header: "수강생",
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="max-w-56 truncate font-medium">
            {row.original.userName || row.original.userEmail}
          </p>
          <p className="max-w-64 truncate text-caption text-muted-foreground">
            {row.original.userEmail}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "courseTitle",
      header: "강의",
      cell: ({ row }) => (
        <p className="max-w-64 truncate" title={row.original.courseTitle}>
          {row.original.courseTitle}
        </p>
      ),
    },
    {
      accessorKey: "status",
      header: "상태",
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          <StatusBadge
            status={row.original.status}
            label={row.original.statusLabel}
          />
          <StatusBadge
            status={row.original.source}
            label={row.original.sourceLabel}
          />
        </div>
      ),
    },
    {
      accessorKey: "progressPercent",
      header: "진도",
      cell: ({ row }) => (
        <div className="min-w-32 space-y-1">
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={row.original.progressPercent}
            aria-label={`진도 ${row.original.progressPercent}%`}
            className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${row.original.progressPercent}%` }}
            />
          </div>
          <p className="text-caption tabular-nums text-muted-foreground">
            {row.original.progressPercent}% · {row.original.completedLessons}/
            {row.original.lessonCount}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "startedLabel",
      header: "시작",
      cell: ({ row }) => <DateValue value={row.original.startedLabel} />,
    },
    {
      accessorKey: "completedLabel",
      header: "수료",
      cell: ({ row }) =>
        row.original.completedLabel ? (
          <span className="flex items-center gap-1.5">
            <DateValue value={row.original.completedLabel} />
            {row.original.certificateId ? (
              <Award
                className="size-4 shrink-0 text-primary"
                aria-label="수료증 발급됨"
              />
            ) : null}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: "actions",
      header: "관리",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <IconAction
            icon={ListChecks}
            label={`${row.original.userEmail} 진도 보기`}
            onClick={() => props.onProgress(row.original.id)}
          />
          <IconAction
            icon={Ban}
            label={`${row.original.userEmail} 수강 회수`}
            onClick={() => props.onRevoke(row.original)}
            disabled={props.busy || row.original.status !== "active"}
          />
        </div>
      ),
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
        >
          <FilterSelect
            value={props.filter.status}
            onChange={(status) => props.onFilter({ status })}
            options={[
              { value: "active", label: "수강 중" },
              { value: "revoked", label: "회수" },
              { value: "expired", label: "만료" },
            ]}
          />
          <FilterSelect
            label="강의"
            value={props.filter.courseId}
            onChange={(courseId) => props.onFilter({ courseId })}
            options={props.courses.map((c) => ({ value: c.id, label: c.title }))}
          />
        </CourseToolbar>
      }
    />
  );
}
