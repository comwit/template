"use client";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/lib/components/ui/badge";
import { AdminPage, AdminPageHeader } from "@/services/admin/_components";
import {
  DateValue,
  CommerceTable,
  CommerceToolbar,
  type ListQuery,
} from "@/services/admin/_components/commerce";
import type { ListFilter, CustomerView } from "@/lib/commerce";
export function CustomersSection(props: {
  query: ListQuery<CustomerView>;
  filter: ListFilter;
  onFilter(filter: Partial<ListFilter>): void;
  onPage(page: number): void;
  onRefresh(): void;
}) {
  const columns: ColumnDef<CustomerView>[] = [
    {
      accessorKey: "name",
      header: "고객",
      cell: ({ row }) => (
        <div className="max-w-72">
          <p className="truncate font-medium" title={row.original.name}>
            {row.original.name}
          </p>
          <p
            className="truncate text-caption text-muted-foreground"
            title={row.original.email}
          >
            {row.original.email}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "emailVerified",
      header: "이메일 인증",
      cell: ({ row }) => (
        <Badge variant={row.original.emailVerified ? "success" : "secondary"}>
          {row.original.emailVerified ? "인증 완료" : "미인증"}
        </Badge>
      ),
    },
    {
      accessorKey: "createdLabel",
      header: "가입일",
      cell: ({ row }) => <DateValue value={row.original.createdLabel} />,
    },
  ];
  return (
    <AdminPage width="6xl">
      <AdminPageHeader title="고객" />
      <CommerceTable
        query={props.query}
        columns={columns}
        onPageChange={props.onPage}
        toolbar={
          <CommerceToolbar
            search={props.filter.search}
            onSearch={(search) => props.onFilter({ search })}
            onRefresh={props.onRefresh}
          />
        }
      />
    </AdminPage>
  );
}
