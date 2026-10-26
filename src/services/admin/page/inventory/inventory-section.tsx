"use client";
import { SlidersHorizontal } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/lib/components/ui/button";
import { Badge } from "@/lib/components/ui/badge";
import { AdminPage, AdminPageHeader } from "@/services/admin/_components";
import {
  NumberValue,
  ReferenceValue,
  IconAction,
  CommerceTable,
  CommerceToolbar,
  FilterSelect,
  type ListQuery,
} from "@/services/admin/_components/commerce";
import type { InventoryView, ListFilter } from "@/lib/commerce";
export function InventorySection(props: {
  query: ListQuery<InventoryView>;
  filter: ListFilter;
  onFilter(filter: Partial<ListFilter>): void;
  onPage(page: number): void;
  onRefresh(): void;
  onSelect(id: string): void;
}) {
  const columns: ColumnDef<InventoryView>[] = [
    {
      accessorKey: "code",
      header: "상품 · 옵션",
      cell: ({ row }) => (
        <div>
          <p
            className="max-w-64 truncate font-medium"
            title={row.original.productName}
          >
            {row.original.productName}
          </p>
          <div className="flex items-center gap-2 text-caption text-muted-foreground">
            <span>{row.original.optionLabel}</span>
            <ReferenceValue value={row.original.code}>SKU</ReferenceValue>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "onHand",
      header: () => <div className="text-right">실재고</div>,
      cell: ({ row }) => (
        <NumberValue>{row.original.onHand.toLocaleString("ko-KR")}</NumberValue>
      ),
    },
    {
      accessorKey: "reserved",
      header: () => <div className="text-right">예약</div>,
      cell: ({ row }) => (
        <NumberValue>
          {row.original.reserved.toLocaleString("ko-KR")}
        </NumberValue>
      ),
    },
    {
      accessorKey: "available",
      header: () => <div className="text-right">판매 가능</div>,
      cell: ({ row }) => (
        <NumberValue>
          <Badge
            variant={row.original.available <= 5 ? "warning" : "secondary"}
          >
            {row.original.available.toLocaleString("ko-KR")}
          </Badge>
        </NumberValue>
      ),
    },
    {
      id: "actions",
      header: "관리",
      cell: ({ row }) => (
        <IconAction
          icon={SlidersHorizontal}
          label={`${row.original.code} 재고 조정·이력`}
          onClick={() => props.onSelect(row.original.id)}
        />
      ),
    },
  ];
  return (
    <AdminPage width="6xl">
      <AdminPageHeader title="재고" />
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
              options={[{ value: "low", label: "재고 5개 이하" }]}
            />
          </CommerceToolbar>
        }
      />
    </AdminPage>
  );
}
