import { model, query, keepPreviousData } from "@comwit/state";
import { purchases as api } from "@/services/app/api/purchases";
import { emptyPage, type PurchaseView } from "@/lib/course";
import type { Pageable } from "@/server/repository/types";
import type { DomainState } from "./types";
export const domain = model<DomainState>({
  list: query<Pageable<PurchaseView>, { page: number }>({
    initialData: emptyPage<PurchaseView>(),
    queryFn: ({ page }) => api.findAll({ page, limit: 20 }),
    placeholderData: keepPreviousData,
  }),
  page: 1,
  isSaving: false,
  error: null,
});
