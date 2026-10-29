import { model, query, keepPreviousData } from "@comwit/state";
import { adminReviews as api } from "@/services/admin/api/reviews";
import { emptyPage, type ReviewView } from "@/lib/course";
import type { Pageable } from "@/server/repository/types";
import type { DomainState, ListArgs } from "./types";
export const domain = model<DomainState>({
  list: query<Pageable<ReviewView>, ListArgs>({
    initialData: emptyPage<ReviewView>(),
    queryFn: (arg) => api.findAll(arg.filter, arg.pageable),
    placeholderData: keepPreviousData,
  }),
  filter: { search: "", status: "" },
  page: 1,
  isSaving: false,
  error: null,
  selectedId: null,
});
