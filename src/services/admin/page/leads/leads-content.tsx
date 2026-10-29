"use client";
import { useAdminLeads } from "@/services/admin/state/leads";
import { LeadsSection } from "./leads-section";
export function LeadsContent() {
  const leads = useAdminLeads((s) => ({
    list: s.list.load({
      filter: s.filter,
      pageable: { page: s.page, limit: 20 },
    }),
    filter: s.filter,
    actions: s.actions,
  }));
  return (
    <LeadsSection
      query={leads.list}
      filter={leads.filter}
      onFilter={leads.actions.setFilter}
      onPage={leads.actions.setPage}
      onRefresh={() => void leads.actions.refresh()}
      onDownload={leads.actions.downloadCsv}
    />
  );
}
