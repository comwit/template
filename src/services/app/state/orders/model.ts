import { model, query, keepPreviousData } from "@comwit/state";
import { orders as api } from "@/services/app/api/orders";
import { emptyPage, type OrderSummary, type OrderView } from "@/lib/course";
import type { Pageable } from "@/server/repository/types";
import type { DomainState } from "./types";
export const domain = model<DomainState>({
  list: query<Pageable<OrderSummary>, { page: number }>({
    initialData: emptyPage<OrderSummary>(),
    queryFn: ({ page }) => api.findAll({ page, limit: 20 }),
    placeholderData: keepPreviousData,
  }),
  page: 1,
  detail: query<OrderView | null, string>({
    initialData: null,
    queryFn: (id) => api.find(id),
  }),
  isSaving: false,
  error: null,
});
