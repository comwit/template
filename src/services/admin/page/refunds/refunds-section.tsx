"use client";
import { Check, X } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/lib/components/ui/button";
import { Alert } from "@/lib/components/ui/alert";
import { AdminPage, AdminPageHeader } from "@/services/admin/_components";
import {
  DateValue,
  NumberValue,
  ReferenceValue,
  CourseTable,
  CourseToolbar,
  FilterSelect,
  StatusBadge,
  type ListQuery,
} from "@/services/admin/_components/course";
import { courseText } from "@/lib/ui-text";
import type { ListFilter, RefundRequestView } from "@/lib/course";
export function RefundsSection(props: {
  query: ListQuery<RefundRequestView>;
  filter: ListFilter;
  busy: boolean;
  error: string | null;
  onFilter(filter: Partial<ListFilter>): void;
  onPage(page: number): void;
  onRefresh(): void;
  onDecide(id: string, approve: boolean): void;
}) {
  const columns: ColumnDef<RefundRequestView>[] = [
    {
      accessorKey: "displayNumber",
      header: "주문",
      cell: ({ row }) => (
        <div className="max-w-56">
          <p className="truncate font-mono text-body-sm">
            {row.original.displayNumber}
          </p>
          <p className="truncate text-caption text-muted-foreground">
            {row.original.customerEmail}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "courseTitle",
      header: "강의",
      cell: ({ row }) => (
        <p
          className="max-w-56 truncate text-body-sm"
          title={row.original.courseTitle}
        >
          {row.original.courseTitle}
        </p>
      ),
    },
    {
      accessorKey: "amountLabel",
      header: () => <div className="text-right">금액</div>,
      cell: ({ row }) => <NumberValue>{row.original.amountLabel}</NumberValue>,
    },
    {
      accessorKey: "reason",
      header: "사유",
      cell: ({ row }) => (
        <div className="max-w-64">
          <ReferenceValue value={row.original.reason}>
            {row.original.reason}
          </ReferenceValue>
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
      header: "신청일",
      cell: ({ row }) => <DateValue value={row.original.createdLabel} />,
    },
    {
      accessorKey: "decidedLabel",
      header: "처리일",
      cell: ({ row }) =>
        row.original.decidedLabel ? (
          <DateValue value={row.original.decidedLabel} />
        ) : (
          <span className="text-caption text-muted-foreground">—</span>
        ),
    },
    {
      id: "actions",
      header: "처리",
      cell: ({ row }) =>
        row.original.status === "pending" ? (
          <div className="flex flex-wrap gap-1.5">
            <Button
              size="sm"
              disabled={props.busy}
              onClick={() => props.onDecide(row.original.id, true)}
            >
              <Check className="size-3.5" aria-hidden="true" />
              승인
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={props.busy}
              onClick={() => props.onDecide(row.original.id, false)}
            >
              <X className="size-3.5" aria-hidden="true" />
              거절
            </Button>
          </div>
        ) : row.original.note ? (
          <ReferenceValue value={row.original.note}>
            <span className="font-sans text-caption text-muted-foreground">
              메모
            </span>
          </ReferenceValue>
        ) : null,
    },
  ];
  return (
    <AdminPage width="6xl">
      <AdminPageHeader title={courseText.refunds} />
      {props.error ? <Alert tone="destructive">{props.error}</Alert> : null}
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
                { value: "pending", label: "대기" },
                { value: "approved", label: "승인" },
                { value: "rejected", label: "거절" },
              ]}
            />
          </CourseToolbar>
        }
      />
    </AdminPage>
  );
}
