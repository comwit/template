import { model, query, keepPreviousData } from "@comwit/state";
import { adminOrders as api } from "@/services/admin/api/orders";
import {
  emptyPage,
  type OrderSummary,
  type OrderView,
  type MovementView,
  type CategoryView,
} from "@/lib/commerce";
import type { Pageable } from "@/server/repository/types";
import type { DomainState, ListArgs } from "./types";
export const domain = model<DomainState>({
  list: query<Pageable<OrderSummary>, ListArgs>({
    initialData: emptyPage<OrderSummary>(),
    queryFn: (arg) => api.findAll(arg.filter, arg.pageable),
    placeholderData: keepPreviousData,
  }),
  filter: { search: "", status: "" },
  page: 1,
  isSaving: false,
  error: null,
  pendingRefund: null,
  detail: query<OrderView | null, string>({
    initialData: null,
    queryFn: (id) => api.find(id),
  }),
  selectedId: null,
});
