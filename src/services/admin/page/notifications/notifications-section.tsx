"use client";
import { RefreshCw, Send, ListChecks } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/lib/components/ui/button";
import { Alert } from "@/lib/components/ui/alert";
import { AdminPage, AdminPageHeader } from "@/services/admin/_components";
import {
  DateValue,
  IconAction,
  CommerceTable,
  CommerceToolbar,
  FilterSelect,
  StatusBadge,
  type ListQuery,
} from "@/services/admin/_components/commerce";
import { NotificationMessage } from "./notification-message";
import type { ListFilter, NotificationView } from "@/lib/commerce";
export function NotificationsSection(props: {
  query: ListQuery<NotificationView>;
  filter: ListFilter;
  busy: boolean;
  error: string | null;
  onFilter(filter: Partial<ListFilter>): void;
  onPage(page: number): void;
  onRefresh(): void;
  onReconcile(id: string): void;
  onRetry(id: string): void;
  onProcessPending(): void;
}) {
  const columns: ColumnDef<NotificationView>[] = [
    {
      accessorKey: "eventLabel",
      header: "알림",
      cell: ({ row }) => (
        <div className="min-w-40">
          <p className="font-medium">{row.original.eventLabel}</p>
          <p className="text-caption text-muted-foreground">
            {row.original.orderNumber} · {row.original.channelLabel}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "상태",
      cell: ({ row }) => (
        <div className="space-y-1">
          <StatusBadge
            status={row.original.status}
            label={row.original.statusLabel}
          />
        </div>
      ),
    },
    { accessorKey: "recipientLabel", header: "수신번호" },
    {
      accessorKey: "createdLabel",
      header: "발송일",
      cell: ({ row }) => <DateValue value={row.original.createdLabel} />,
    },
    {
      id: "actions",
      header: "처리",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <NotificationMessage notification={row.original} />
          {row.original.canReconcile ? (
            <IconAction
              icon={RefreshCw}
              label="발송 결과 조회"
              disabled={props.busy}
              onClick={() => props.onReconcile(row.original.id)}
            />
          ) : null}
          {row.original.canRetry ? (
            <Button
              size="sm"
              variant="outline"
              disabled={props.busy}
              onClick={() => props.onRetry(row.original.id)}
            >
              <Send className="size-3.5" aria-hidden="true" />
              재발송
            </Button>
          ) : null}
        </div>
      ),
    },
  ];
  return (
    <AdminPage width="6xl">
      <AdminPageHeader
        title="알림"
        action={
          <Button
            variant="outline"
            disabled={props.busy}
            onClick={props.onProcessPending}
          >
            <ListChecks className="size-4" aria-hidden="true" />
            대기 처리
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
                { value: "pending", label: "대기" },
                { value: "submitted", label: "접수" },
                { value: "delivered", label: "전달 완료" },
                { value: "failed", label: "실패" },
                { value: "unknown", label: "확인 필요" },
                { value: "skipped", label: "발송 안 함" },
              ]}
            />
          </CommerceToolbar>
        }
      />
    </AdminPage>
  );
}
