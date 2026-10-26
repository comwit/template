import { model, query, keepPreviousData } from "@comwit/state";
import { adminCustomers as api } from "@/services/admin/api/customers";
import {
  emptyPage,
  type CustomerView,
  type OrderView,
  type MovementView,
  type CategoryView,
} from "@/lib/commerce";
import type { Pageable } from "@/server/repository/types";
import type { DomainState, ListArgs } from "./types";
export const domain = model<DomainState>({
  list: query<Pageable<CustomerView>, ListArgs>({
    initialData: emptyPage<CustomerView>(),
    queryFn: (arg) => api.findAll(arg.filter, arg.pageable),
    placeholderData: keepPreviousData,
  }),
  filter: { search: "", status: "" },
  page: 1,
  isSaving: false,
  error: null,
});
