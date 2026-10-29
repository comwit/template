"use client";
import { Plus, Pencil } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/lib/components/ui/button";
import { Switch } from "@/lib/components/ui/switch";
import { AdminPage, AdminPageHeader } from "@/services/admin/_components";
import {
  NumberValue,
  IconAction,
  CourseTable,
  CourseToolbar,
  FilterSelect,
  StatusBadge,
  type ListQuery,
} from "@/services/admin/_components/course";
import { courseText } from "@/lib/ui-text";
import type { ListFilter, CouponView } from "@/lib/course";
export function CouponsSection(props: {
  query: ListQuery<CouponView>;
  filter: ListFilter;
  busy: boolean;
  onFilter(filter: Partial<ListFilter>): void;
  onPage(page: number): void;
  onRefresh(): void;
  onCreate(): void;
  onEdit(coupon: CouponView): void;
  onToggle(id: string, active: boolean): void;
}) {
  const columns: ColumnDef<CouponView>[] = [
    {
      accessorKey: "code",
      header: "코드",
      cell: ({ row }) => (
        <div className="max-w-56">
          <p className="font-mono text-body-sm">{row.original.code}</p>
          <p className="truncate text-caption text-muted-foreground">
            {row.original.name}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "valueLabel",
      header: "할인",
      cell: ({ row }) => (
        <div className="whitespace-nowrap text-body-sm">
          <span className="font-medium tabular-nums">
            {row.original.valueLabel}
          </span>
          <span className="ml-1 text-caption text-muted-foreground">
            {row.original.typeLabel}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "minAmountLabel",
      header: () => <div className="text-right">최소 금액</div>,
      cell: ({ row }) => (
        <NumberValue>
          {row.original.minAmount ? (
            row.original.minAmountLabel
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </NumberValue>
      ),
    },
    {
      accessorKey: "courseTitle",
      header: "대상",
      cell: ({ row }) => (
        <p
          className="max-w-56 truncate text-body-sm"
          title={row.original.courseTitle ?? undefined}
        >
          {row.original.courseTitle ?? (
            <span className="text-muted-foreground">전체 강의</span>
          )}
        </p>
      ),
    },
    {
      id: "period",
      header: "기간",
      cell: ({ row }) =>
        row.original.startsLabel || row.original.endsLabel ? (
          <span className="inline-flex flex-col whitespace-nowrap text-caption tabular-nums">
            <span>{row.original.startsLabel ?? "즉시"}</span>
            <span className="text-muted-foreground">
              – {row.original.endsLabel ?? "무기한"}
            </span>
          </span>
        ) : (
          <span className="text-caption text-muted-foreground">무기한</span>
        ),
    },
    {
      accessorKey: "usageLabel",
      header: () => <div className="text-right">사용</div>,
      cell: ({ row }) => (
        <NumberValue>
          {row.original.usageLabel}
          <span className="block text-caption font-normal text-muted-foreground">
            1인 {row.original.perUserLimit}회
          </span>
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
      header: "활성",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Switch
            size="sm"
            checked={row.original.active}
            disabled={props.busy}
            aria-label={`${row.original.code} 활성`}
            onCheckedChange={(active) =>
              props.onToggle(row.original.id, active)
            }
          />
          <IconAction
            icon={Pencil}
            label={courseText.edit}
            onClick={() => props.onEdit(row.original)}
          />
        </div>
      ),
    },
  ];
  return (
    <AdminPage width="6xl">
      <AdminPageHeader
        title={courseText.coupons}
        action={
          <Button onClick={props.onCreate}>
            <Plus className="size-4" aria-hidden="true" />
            쿠폰 등록
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
                { value: "active", label: "사용 가능" },
                { value: "inactive", label: "중지" },
                { value: "expired", label: "만료" },
              ]}
            />
          </CourseToolbar>
        }
      />
    </AdminPage>
  );
}
