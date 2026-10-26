"use client";
import { useCustomers } from "@/services/admin/state/customers";
import { CustomersSection } from "./customers-section";
export function CustomersContent() {
  const customers = useCustomers((s) => ({
    list: s.list.load({
      filter: s.filter,
      pageable: { page: s.page, limit: 20 },
    }),
    filter: s.filter,
    actions: s.actions,
  }));
  return (
    <CustomersSection
      query={customers.list}
      filter={customers.filter}
      onFilter={customers.actions.setFilter}
      onPage={customers.actions.setPage}
      onRefresh={() => void customers.actions.refresh()}
    />
  );
}
