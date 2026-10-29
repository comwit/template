"use client";
import Link from "next/link";
import { RefreshCw, RotateCcw, ReceiptText, ListChecks } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/lib/components/ui/button";
import { Badge } from "@/lib/components/ui/badge";
import { Alert } from "@/lib/components/ui/alert";
import { AdminPage, AdminPageHeader } from "@/services/admin/_components";
import {
  DateValue,
  NumberValue,
  ReferenceValue,
  IconAction,
  CourseTable,
  CourseToolbar,
  FilterSelect,
  StatusBadge,
  type ListQuery,
} from "@/services/admin/_components/course";
import { adminText, courseText } from "@/lib/ui-text";
import type { ListFilter, PaymentRowView } from "@/lib/course";
export function PaymentsSection(props: {
  query: ListQuery<PaymentRowView>;
  filter: ListFilter;
  busy: boolean;
  error: string | null;
  onFilter(filter: Partial<ListFilter>): void;
  onPage(page: number): void;
  onRefresh(): void;
  onReconcile(id: string): void;
  onRetryRefund(id: string): void;
  onReconcilePending(): void;
}) {
  const columns: ColumnDef<PaymentRowView>[] = [
    {
      accessorKey: "providerOrderId",
      header: "주문",
      cell: ({ row }) => (
        <div className="max-w-56">
          <ReferenceValue value={row.original.providerOrderId}>
            {row.original.displayOrderNumber}
          </ReferenceValue>
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
      header: () => <div className="text-right">승인액</div>,
      cell: ({ row }) => <NumberValue>{row.original.amountLabel}</NumberValue>,
    },
    {
      accessorKey: "refundedLabel",
      header: () => <div className="text-right">환불액</div>,
      cell: ({ row }) => (
        <NumberValue>
          {row.original.refundedAmount ? (
            row.original.refundedLabel
          ) : (
            <span
              className="text-muted-foreground"
              aria-label={row.original.refundedLabel}
            >
              {adminText.noRefund}
            </span>
          )}
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
      accessorKey: "method",
      header: "수단",
      cell: ({ row }) => (
        <div className="flex flex-wrap items-center gap-1.5 text-body-sm">
          <span>{row.original.method}</span>
          <Badge
            variant={row.original.mode === "live" ? "secondary" : "warning"}
          >
            {row.original.mode === "live" ? "실결제" : "테스트"}
          </Badge>
        </div>
      ),
    },
    {
      accessorKey: "createdLabel",
      header: "결제일",
      cell: ({ row }) => <DateValue value={row.original.createdLabel} />,
    },
    {
      id: "actions",
      header: "확인",
      cell: ({ row }) => (
        <div className="flex flex-wrap items-center gap-1">
          <IconAction
            icon={RefreshCw}
            label="대사"
            disabled={props.busy || row.original.status === "ready"}
            onClick={() => props.onReconcile(row.original.id)}
          />
          {row.original.pendingRefundId ? (
            <Button
              size="sm"
              variant="outline"
              disabled={props.busy}
              onClick={() => props.onRetryRefund(row.original.pendingRefundId!)}
            >
              <RotateCcw className="size-3.5" aria-hidden="true" />
              환불 재확인
            </Button>
          ) : null}
          {row.original.receiptUrl ? (
            <Button asChild variant="ghost" size="icon" title="영수증">
              <Link
                href={row.original.receiptUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="영수증"
              >
                <ReceiptText className="size-4" aria-hidden="true" />
              </Link>
            </Button>
          ) : null}
        </div>
      ),
    },
  ];
  return (
    <AdminPage width="6xl">
      <AdminPageHeader
        title={courseText.payments}
        action={
          <Button
            variant="outline"
            disabled={props.busy}
            onClick={props.onReconcilePending}
          >
            <ListChecks className="size-4" aria-hidden="true" />
            미확인 결제 일괄 대사
          </Button>
        }
      />
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
                { value: "done", label: "결제 완료" },
                { value: "cancelled", label: "취소" },
                { value: "unknown", label: "확인 필요" },
                { value: "confirming", label: "승인 중" },
                { value: "failed", label: "실패" },
              ]}
            />
          </CourseToolbar>
        }
      />
    </AdminPage>
  );
}
