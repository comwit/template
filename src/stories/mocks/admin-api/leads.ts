import type { AdminLeadsAPI } from "@/services/admin/api/leads";
import { list, mockApi } from "../runtime";

export const adminLeads = {
  /** status 필터는 리드 출처(free_course·free_product)로 쓴다. */
  findAll: mockApi<AdminLeadsAPI["findAll"]>((db, filter, page) =>
    list(
      filter.status ? db.leads.filter((item) => item.source === filter.status) : db.leads,
      { search: filter.search },
      page,
    ),
  ),
} satisfies AdminLeadsAPI;
