import { model, query, keepPreviousData } from "@comwit/state";
import { adminPayments as api } from "@/services/admin/api/payments";
import {
  emptyPage,
  type PaymentView,
  type OrderView,
  type MovementView,
  type CategoryView,
} from "@/lib/commerce";
import type { Pageable } from "@/server/repository/types";
import type { DomainState, ListArgs } from "./types";
export const domain = model<DomainState>({
  list: query<Pageable<PaymentView>, ListArgs>({
    initialData: emptyPage<PaymentView>(),
    queryFn: (arg) => api.findAll(arg.filter, arg.pageable),
    placeholderData: keepPreviousData,
  }),
  filter: { search: "", status: "" },
  page: 1,
  isSaving: false,
  error: null,
});
