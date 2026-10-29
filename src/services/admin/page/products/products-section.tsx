"use client";
import Link from "next/link";
import { Archive, Plus } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/lib/components/ui/button";
import { Badge } from "@/lib/components/ui/badge";
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
import type { ListFilter, ProductSummary } from "@/services/admin/state/products";
import { adminRoutes } from "@/lib/admin-routes";
import { courseText } from "@/lib/ui-text";
export type ProductsSectionProps = {
  query: ListQuery<ProductSummary>;
  filter: ListFilter;
  busy?: boolean;
  onFilter(filter: Partial<ListFilter>): void;
  onPage(page: number): void;
  onRefresh(): void;
  onCreate(): void;
  onArchive(id: string): void;
};
export function ProductsSection(props: ProductsSectionProps) {
  const columns: ColumnDef<ProductSummary>[] = [
    {
      accessorKey: "title",
      header: "상품",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          {row.original.thumbnail ? (
            <img
              className="h-10 w-16 shrink-0 rounded-control object-cover"
              src={row.original.thumbnail.thumb ?? row.original.thumbnail.url}
              width={64}
              height={40}
              loading="lazy"
              decoding="async"
              alt=""
            />
          ) : (
            <span className="h-10 w-16 shrink-0 rounded-control bg-muted" />
          )}
          <div className="min-w-0">
            <Link
              href={adminRoutes.productEditor(row.original.id)}
              className="block max-w-72 truncate font-medium hover:underline"
              title={row.original.title}
            >
              {row.original.title || "(제목 없음)"}
            </Link>
            <p className="max-w-72 truncate font-mono text-caption text-muted-foreground">
              {row.original.slug}
            </p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "kind",
      header: "종류",
      cell: ({ row }) => (
        <div className="whitespace-nowrap">
          <Badge variant={row.original.kind === "bundle" ? "info" : "secondary"}>
            {row.original.kindLabel}
          </Badge>
          <p className="mt-0.5 text-caption text-muted-foreground">
            {row.original.categoryName ?? "미분류"}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "priceLabel",
      header: () => <div className="text-right">가격</div>,
      cell: ({ row }) => (
        <NumberValue>
          {row.original.originalPriceLabel ? (
            <span className="mr-1.5 font-normal text-muted-foreground line-through">
              {row.original.originalPriceLabel}
            </span>
          ) : null}
          {row.original.priceLabel}
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
      accessorKey: "fileCount",
      header: () => <div className="text-right">구성</div>,
      cell: ({ row }) => (
        <NumberValue>
          파일 {row.original.fileCount.toLocaleString("ko-KR")}
          {row.original.courseCount ? (
            <span className="block text-caption font-normal text-muted-foreground">
              강의 {row.original.courseCount.toLocaleString("ko-KR")}
            </span>
          ) : null}
        </NumberValue>
      ),
    },
    {
      accessorKey: "purchaseCount",
      header: () => <div className="text-right">구매</div>,
      cell: ({ row }) => (
        <NumberValue>
          {row.original.purchaseCount.toLocaleString("ko-KR")}
        </NumberValue>
      ),
    },
    {
      accessorKey: "createdLabel",
      header: "등록",
      cell: ({ row }) => <DateValue value={row.original.createdLabel} />,
    },
    {
      id: "actions",
      header: "관리",
      cell: ({ row }) => (
        <IconAction
          icon={Archive}
          label={`${row.original.title} 보관`}
          onClick={() => props.onArchive(row.original.id)}
          disabled={props.busy || row.original.status === "archived"}
        />
      ),
    },
  ];
  return (
    <AdminPage width="6xl">
      <AdminPageHeader
        title={courseText.products}
        action={
          <Button onClick={props.onCreate} disabled={props.busy}>
            <Plus className="size-4" aria-hidden="true" />
            상품 등록
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
                { value: "draft", label: "초안" },
                { value: "published", label: "공개" },
                { value: "archived", label: "보관" },
              ]}
            />
          </CourseToolbar>
        }
      />
    </AdminPage>
  );
}
