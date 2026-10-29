"use client";
import { Check, Download, Minus } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/lib/components/ui/badge";
import { AdminPage, AdminPageHeader } from "@/services/admin/_components";
import {
  DateValue,
  IconAction,
  CourseTable,
  CourseToolbar,
  FilterSelect,
  type ListQuery,
} from "@/services/admin/_components/course";
import type { ListFilter, LeadView } from "@/services/admin/state/leads";
import { courseText } from "@/lib/ui-text";
export type LeadsSectionProps = {
  query: ListQuery<LeadView>;
  filter: ListFilter;
  onFilter(filter: Partial<ListFilter>): void;
  onPage(page: number): void;
  onRefresh(): void;
  onDownload(): void;
};
export function LeadsSection(props: LeadsSectionProps) {
  const columns: ColumnDef<LeadView>[] = [
    {
      accessorKey: "name",
      header: "이름",
      cell: ({ row }) => (
        <p className="max-w-40 truncate font-medium">{row.original.name || "—"}</p>
      ),
    },
    {
      accessorKey: "email",
      header: "이메일",
      cell: ({ row }) => (
        <p className="max-w-64 truncate text-body-sm" title={row.original.email}>
          {row.original.email}
        </p>
      ),
    },
    {
      accessorKey: "phone",
      header: "연락처",
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-body-sm tabular-nums">
          {row.original.phone || <span className="text-muted-foreground">—</span>}
        </span>
      ),
    },
    {
      accessorKey: "source",
      header: "출처",
      cell: ({ row }) => (
        <Badge variant={row.original.source === "free_product" ? "info" : "secondary"}>
          {row.original.sourceLabel}
        </Badge>
      ),
    },
    {
      accessorKey: "itemTitle",
      header: "신청 항목",
      cell: ({ row }) => (
        <p className="max-w-64 truncate text-body-sm" title={row.original.itemTitle}>
          {row.original.itemTitle}
        </p>
      ),
    },
    {
      accessorKey: "consent",
      header: () => <div className="text-center">동의</div>,
      cell: ({ row }) => (
        <div className="flex justify-center">
          {row.original.consent ? (
            <Check className="size-4 text-primary" aria-label="마케팅 수신 동의" />
          ) : (
            <Minus
              className="size-4 text-muted-foreground"
              aria-label="마케팅 수신 미동의"
            />
          )}
        </div>
      ),
    },
    {
      accessorKey: "createdLabel",
      header: "신청일",
      cell: ({ row }) => <DateValue value={row.original.createdLabel} />,
    },
  ];
  return (
    <AdminPage width="6xl">
      <AdminPageHeader
        title={courseText.leads}
        action={
          <IconAction
            icon={Download}
            label="CSV 내려받기"
            variant="outline"
            onClick={props.onDownload}
            disabled={props.query.data.items.length === 0}
          />
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
              label="출처"
              value={props.filter.status}
              onChange={(status) => props.onFilter({ status })}
              options={[
                { value: "free_course", label: "무료 강의" },
                { value: "free_product", label: "무료 자료" },
              ]}
            />
          </CourseToolbar>
        }
      />
    </AdminPage>
  );
}
