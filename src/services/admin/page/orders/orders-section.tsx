"use client";
import { TimerReset } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/lib/components/ui/button";
import { AdminPage, AdminPageHeader } from "@/services/admin/_components";
import {
  DateValue,
  NumberValue,
  IconAction,
  CourseTable,
  CourseToolbar,
  FilterSelect,
  StatusBadge,
  type ListQuery,
} from "@/services/admin/_components/course";
import { courseText } from "@/lib/ui-text";
import type { ListFilter, OrderSummary } from "@/lib/course";
export function OrdersSection(props: {
  query: ListQuery<OrderSummary>;
  filter: ListFilter;
  busy?: boolean;
  onFilter(filter: Partial<ListFilter>): void;
  onPage(page: number): void;
  onRefresh(): void;
  onSelect(id: string): void;
  onExpire(): void;
}) {
  const columns: ColumnDef<OrderSummary>[] = [
    {
      accessorKey: "number",
      header: "주문",
      cell: ({ row }) => (
        <div className="max-w-64">
          <Button
            variant="link"
            className="h-auto max-w-full truncate p-0 text-left font-mono text-body-sm"
            title={row.original.number}
            onClick={() => props.onSelect(row.original.id)}
          >
            {row.original.displayNumber}
          </Button>
          <p className="max-w-56 truncate text-caption text-muted-foreground">
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
          className="max-w-64 truncate text-body-sm"
          title={row.original.courseTitle}
        >
          {row.original.courseTitle}
        </p>
      ),
    },
    {
      accessorKey: "totalLabel",
      header: () => <div className="text-right">금액</div>,
      cell: ({ row }) => <NumberValue>{row.original.totalLabel}</NumberValue>,
    },
    {
      accessorKey: "paymentStatus",
      header: "결제",
      cell: ({ row }) => (
        <StatusBadge
          status={row.original.paymentStatus}
          label={row.original.paymentLabel}
        />
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
      header: "주문일",
      cell: ({ row }) => <DateValue value={row.original.createdLabel} />,
    },
  ];
  return (
    <AdminPage width="6xl">
      <AdminPageHeader
        title={courseText.orders}
        action={
          <IconAction
            icon={TimerReset}
            label="만료 주문 정리"
            onClick={props.onExpire}
            disabled={props.busy}
            variant="outline"
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
              value={props.filter.status}
              onChange={(status) => props.onFilter({ status })}
              options={[
                { value: "pending", label: "결제 대기" },
                { value: "confirmed", label: "결제 완료" },
                { value: "cancelled", label: "취소" },
                { value: "expired", label: "만료" },
                { value: "refunded", label: "환불" },
              ]}
            />
          </CourseToolbar>
        }
      />
    </AdminPage>
  );
}
