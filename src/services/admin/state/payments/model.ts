import { model, query, keepPreviousData } from "@comwit/state";
import { adminPayments as api } from "@/services/admin/api/payments";
import { emptyPage, type PaymentRowView } from "@/lib/course";
import type { Pageable } from "@/server/repository/types";
import type { DomainState, ListArgs } from "./types";
export const domain = model<DomainState>({
  list: query<Pageable<PaymentRowView>, ListArgs>({
    initialData: emptyPage<PaymentRowView>(),
    queryFn: (arg) => api.findAll(arg.filter, arg.pageable),
    placeholderData: keepPreviousData,
  }),
  filter: { search: "", status: "" },
  page: 1,
  isSaving: false,
  error: null,
});
