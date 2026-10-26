"use client";
import { Pencil, Archive, Tags, Plus } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/lib/components/ui/button";
import { AdminPage, AdminPageHeader } from "@/services/admin/_components";
import {
  DateValue,
  NumberValue,
  IconAction,
  CommerceTable,
  CommerceToolbar,
  FilterSelect,
  StatusBadge,
  type ListQuery,
} from "@/services/admin/_components/commerce";
import type { ListFilter, ProductView } from "@/lib/commerce";
import { commerceText } from "@/lib/ui-text";
export type ProductsSectionProps = {
  query: ListQuery<ProductView>;
  filter: ListFilter;
  busy?: boolean;
  onFilter(filter: Partial<ListFilter>): void;
  onPage(page: number): void;
  onRefresh(): void;
  onCreate(): void;
  onEdit(id: string): void;
  onArchive(id: string): void;
  onCategory(): void;
};
export function ProductsSection(props: ProductsSectionProps) {
  const columns: ColumnDef<ProductView>[] = [
    {
      accessorKey: "name",
      header: "상품",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          {row.original.images[0] ? (
            <img
              className="size-10 rounded-control object-cover"
              src={row.original.images[0].url}
              width={40}
              height={40}
              alt=""
            />
          ) : (
            <span className="size-10 rounded-control bg-muted" />
          )}
          <p
            className="max-w-72 truncate font-medium"
            title={row.original.name}
          >
            {row.original.name}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "priceLabel",
      header: () => <div className="text-right">판매가</div>,
      cell: ({ row }) => <NumberValue>{row.original.priceLabel}</NumberValue>,
    },
    {
      accessorKey: "status",
      header: "판매 상태",
      cell: ({ row }) => (
        <StatusBadge
          status={row.original.status}
          label={row.original.statusLabel}
        />
      ),
    },
    {
      accessorKey: "createdLabel",
      header: "등록일",
      cell: ({ row }) => <DateValue value={row.original.createdLabel} />,
    },
    {
      id: "actions",
      header: "관리",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <IconAction
            icon={Pencil}
            label={`${row.original.name} 수정`}
            onClick={() => props.onEdit(row.original.id)}
            disabled={props.busy}
          />
          <IconAction
            icon={Archive}
            label={`${row.original.name} 판매 중지`}
            onClick={() => props.onArchive(row.original.id)}
            disabled={props.busy || row.original.status === "archived"}
          />
        </div>
      ),
    },
  ];
  return (
    <AdminPage width="6xl">
      <AdminPageHeader
        title={commerceText.products}

        action={
          <div className="flex gap-2">
            <IconAction
              icon={Tags}
              label="카테고리 관리"
              onClick={props.onCategory}
              variant="outline"
            />
            <Button onClick={props.onCreate}>
              <Plus className="size-4" aria-hidden="true" />
              {commerceText.addProduct}
            </Button>
          </div>
        }
      />
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
                { value: "draft", label: "초안" },
                { value: "active", label: "판매 중" },
                { value: "archived", label: "판매 중지" },
              ]}
            />
          </CommerceToolbar>
        }
      />
    </AdminPage>
  );
}
