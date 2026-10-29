"use client";
import { Ban } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/lib/components/ui/badge";
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
import type {
  EnrollmentFilter,
  PurchaseView,
  ProductSummary,
} from "@/services/admin/state/students";
/** 구매 목록. filter.courseId 가 상품 id 역할을 한다. */
export function PurchasesTable(props: {
  query: ListQuery<PurchaseView>;
  filter: EnrollmentFilter;
  products: ProductSummary[];
  busy: boolean;
  onFilter(filter: Partial<EnrollmentFilter>): void;
  onPage(page: number): void;
  onRefresh(): void;
  onRevoke(purchase: PurchaseView): void;
}) {
  const columns: ColumnDef<PurchaseView>[] = [
    {
      accessorKey: "userEmail",
      header: "구매자",
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
      accessorKey: "productTitle",
      header: "상품",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <p className="max-w-56 truncate" title={row.original.productTitle}>
            {row.original.productTitle}
          </p>
          <Badge variant={row.original.kind === "bundle" ? "info" : "secondary"}>
            {row.original.kindLabel}
          </Badge>
        </div>
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
      accessorKey: "downloadsLabel",
      header: () => <div className="text-right">다운로드</div>,
      cell: ({ row }) => <NumberValue>{row.original.downloadsLabel}</NumberValue>,
    },
    {
      accessorKey: "purchasedLabel",
      header: "구매일",
      cell: ({ row }) => <DateValue value={row.original.purchasedLabel} />,
    },
    {
      accessorKey: "lastDownloadedLabel",
      header: "최근 다운로드",
      cell: ({ row }) =>
        row.original.lastDownloadedLabel ? (
          <DateValue value={row.original.lastDownloadedLabel} />
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: "actions",
      header: "관리",
      cell: ({ row }) => (
        <IconAction
          icon={Ban}
          label={`${row.original.userEmail} 구매 회수`}
          onClick={() => props.onRevoke(row.original)}
          disabled={props.busy || row.original.status !== "active"}
        />
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
              { value: "active", label: "구매 완료" },
              { value: "revoked", label: "회수" },
            ]}
          />
          <FilterSelect
            label="상품"
            value={props.filter.courseId}
            onChange={(courseId) => props.onFilter({ courseId })}
            options={props.products.map((p) => ({ value: p.id, label: p.title }))}
          />
        </CourseToolbar>
      }
    />
  );
}
