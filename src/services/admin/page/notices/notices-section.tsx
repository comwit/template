"use client";
import { Plus, Pencil, Trash2, Pin } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/lib/components/ui/button";
import { AdminPage, AdminPageHeader } from "@/services/admin/_components";
import {
  DateValue,
  IconAction,
  CourseTable,
  CourseToolbar,
  FilterSelect,
  StatusBadge,
  type ListQuery,
} from "@/services/admin/_components/course";
import { courseText } from "@/lib/ui-text";
import type { ListFilter, NoticeView } from "@/lib/course";
export function NoticesSection(props: {
  query: ListQuery<NoticeView>;
  filter: ListFilter;
  busy?: boolean;
  onFilter(filter: Partial<ListFilter>): void;
  onPage(page: number): void;
  onRefresh(): void;
  onCreate(): void;
  onEdit(id: string): void;
  onRemove(id: string): void;
}) {
  const columns: ColumnDef<NoticeView>[] = [
    {
      accessorKey: "title",
      header: "제목",
      cell: ({ row }) => (
        <Button
          variant="link"
          className="h-auto max-w-72 justify-start gap-1 truncate p-0 text-left text-body-sm font-semibold"
          onClick={() => props.onEdit(row.original.id)}
        >
          {row.original.pinned ? (
            <Pin className="size-3.5 shrink-0 text-primary" aria-label="고정됨" />
          ) : null}
          <span className="truncate">{row.original.title}</span>
        </Button>
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
      accessorKey: "publishedLabel",
      header: "게시일",
      cell: ({ row }) =>
        row.original.publishedLabel ? (
          <DateValue value={row.original.publishedLabel} />
        ) : (
          <span className="text-caption text-muted-foreground">—</span>
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
            icon={Pencil}
            label={courseText.edit}
            onClick={() => props.onEdit(row.original.id)}
            disabled={props.busy}
          />
          <IconAction
            icon={Trash2}
            label="삭제"
            onClick={() => props.onRemove(row.original.id)}
            disabled={props.busy}
          />
        </div>
      ),
    },
  ];
  return (
    <AdminPage width="6xl">
      <AdminPageHeader
        title={courseText.notices}
        action={
          <Button size="sm" onClick={props.onCreate}>
            <Plus className="size-4" aria-hidden="true" />
            공지 등록
          </Button>
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
                { value: "published", label: "게시" },
                { value: "draft", label: "임시 저장" },
              ]}
            />
          </CourseToolbar>
        }
      />
    </AdminPage>
  );
}
