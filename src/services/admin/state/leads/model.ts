import { model, query, keepPreviousData } from "@comwit/state";
import { adminLeads } from "@/services/admin/api/leads";
import { emptyPage, type LeadView } from "@/lib/course";
import type { Pageable } from "@/server/repository/types";
import type { DomainState, ListArgs } from "./types";
export const domain = model<DomainState>({
  list: query<Pageable<LeadView>, ListArgs>({
    initialData: emptyPage<LeadView>(),
    queryFn: (args) => adminLeads.findAll(args.filter, args.pageable),
    placeholderData: keepPreviousData,
  }),
  filter: { search: "", status: "" },
  page: 1,
  isSaving: false,
  error: null,
});
