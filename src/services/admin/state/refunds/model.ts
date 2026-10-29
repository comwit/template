import { model, query, keepPreviousData } from "@comwit/state";
import { adminRefunds as api } from "@/services/admin/api/refunds";
import { emptyPage, type RefundRequestView } from "@/lib/course";
import type { Pageable } from "@/server/repository/types";
import type { DomainState, ListArgs } from "./types";
export const domain = model<DomainState>({
  list: query<Pageable<RefundRequestView>, ListArgs>({
    initialData: emptyPage<RefundRequestView>(),
    queryFn: (arg) => api.findAll(arg.filter, arg.pageable),
    placeholderData: keepPreviousData,
  }),
  filter: { search: "", status: "" },
  page: 1,
  selected: null,
  isSaving: false,
  error: null,
  pendingDecision: null,
});
