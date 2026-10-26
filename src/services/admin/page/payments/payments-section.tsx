"use client";
import Link from "next/link";
import { RefreshCw, RotateCcw, ReceiptText, ListChecks } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/lib/components/ui/button";
import { Alert } from "@/lib/components/ui/alert";
import { AdminPage, AdminPageHeader } from "@/services/admin/_components";
import {
  NumberValue,
  ReferenceValue,
  IconAction,
  CommerceTable,
  CommerceToolbar,
  FilterSelect,
  StatusBadge,
  type ListQuery,
} from "@/services/admin/_components/commerce";
import { adminText } from "@/lib/ui-text";
import type { ListFilter, PaymentView } from "@/lib/commerce";
export function PaymentsSection(props: {
  query: ListQuery<PaymentView>;
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
  const columns: ColumnDef<PaymentView>[] = [
    {
      accessorKey: "providerOrderId",
      header: "주문번호",
      cell: ({ row }) => (
        <div className="max-w-52">
          <ReferenceValue value={row.original.providerOrderId}>
            {row.original.displayOrderNumber ?? row.original.providerOrderId}
          </ReferenceValue>
          <p className="text-caption text-muted-foreground">
            {row.original.mode === "test" ? "테스트" : "실결제"} ·{" "}
            {row.original.method}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "amountLabel",
      header: () => <div className="text-right">승인액</div>,
      cell: ({ row }) => <NumberValue>{row.original.amountLabel}</NumberValue>,
    },
    {
      accessorKey: "refundedLabel",
      header: () => <div className="text-right">취소액</div>,
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
      id: "actions",
      header: "확인",
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-2">
          <IconAction
            icon={RefreshCw}
            label="결제 상태 확인"
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
              환불 재시도
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
        title="결제와 환불"

        action={
          <Button
            variant="outline"
            disabled={props.busy}
            onClick={props.onReconcilePending}
          >
            <ListChecks className="size-4" aria-hidden="true" />
            재확인
          </Button>
        }
      />
      {props.error ? <Alert tone="destructive">{props.error}</Alert> : null}
      <CommerceTable
        query={props.query}
        columns={columns}
        onPageChange={props.onPage}
        toolbar={
          <CommerceToolbar
            search={props.filter.search}
            onSearch={(search) => props.onFilter({ search })}
            onRefresh={props.onRefresh}
          >
            <FilterSelect
              value={props.filter.status}
              onChange={(status) => props.onFilter({ status })}
              options={[
                { value: "done", label: "결제 완료" },
                { value: "partial_cancelled", label: "부분 취소" },
                { value: "cancelled", label: "전액 취소" },
                { value: "unknown", label: "확인 필요" },
                { value: "confirming", label: "승인 중" },
              ]}
            />
          </CommerceToolbar>
        }
      />
    </AdminPage>
  );
}
