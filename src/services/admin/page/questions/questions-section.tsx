"use client";
import { Pin, MessageSquare } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/lib/components/ui/button";
import { AdminPage, AdminPageHeader } from "@/services/admin/_components";
import {
  DateValue,
  CourseTable,
  CourseToolbar,
  FilterSelect,
  StatusBadge,
  type ListQuery,
} from "@/services/admin/_components/course";
import { courseText } from "@/lib/ui-text";
import type { ListFilter, QuestionView } from "@/lib/course";
export function QuestionsSection(props: {
  query: ListQuery<QuestionView>;
  filter: ListFilter;
  onFilter(filter: Partial<ListFilter>): void;
  onPage(page: number): void;
  onRefresh(): void;
  onSelect(id: string): void;
}) {
  const columns: ColumnDef<QuestionView>[] = [
    {
      accessorKey: "title",
      header: "질문",
      cell: ({ row }) => (
        <div className="max-w-72">
          <Button
            variant="link"
            className="h-auto max-w-full justify-start gap-1 truncate p-0 text-left text-body-sm font-semibold"
            onClick={() => props.onSelect(row.original.id)}
          >
            {row.original.pinned ? (
              <Pin
                className="size-3.5 shrink-0 text-primary"
                aria-label="고정됨"
              />
            ) : null}
            <span className="truncate">{row.original.title}</span>
          </Button>
          <p className="truncate text-caption text-muted-foreground">
            {row.original.courseTitle}
            {row.original.lessonTitle ? ` · ${row.original.lessonTitle}` : ""}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "userName",
      header: "작성자",
      cell: ({ row }) => (
        <span className="text-body-sm">{row.original.userName}</span>
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
      accessorKey: "commentCount",
      header: () => <div className="text-right">댓글</div>,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1 text-body-sm tabular-nums">
          <MessageSquare
            className="size-3.5 text-muted-foreground"
            aria-hidden="true"
          />
          {row.original.commentCount}
        </div>
      ),
    },
    {
      accessorKey: "createdLabel",
      header: "작성일",
      cell: ({ row }) => <DateValue value={row.original.createdLabel} />,
    },
  ];
  return (
    <AdminPage width="6xl">
      <AdminPageHeader title={courseText.questions} />
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
                { value: "open", label: "답변 대기" },
                { value: "answered", label: "답변 완료" },
                { value: "closed", label: "닫힘" },
              ]}
            />
          </CourseToolbar>
        }
      />
    </AdminPage>
  );
}
