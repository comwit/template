import { model, query, keepPreviousData } from "@comwit/state";
import { catalog as api } from "@/services/app/api/catalog";
import {
  emptyPage,
  type ProductView,
  type OrderView,
  type MovementView,
  type CategoryView,
} from "@/lib/commerce";
import type { Pageable } from "@/server/repository/types";
import type { DomainState, ListArgs } from "./types";
export const domain = model<DomainState>({
  list: query<Pageable<ProductView>, ListArgs>({
    initialData: emptyPage<ProductView>(),
    queryFn: (arg) => api.findAll(arg.filter, arg.pageable),
    placeholderData: keepPreviousData,
  }),
  filter: { search: "", status: "" },
  page: 1,
  isSaving: false,
  error: null,
  detail: query<ProductView | null, string>({
    initialData: null,
    queryFn: (id) => api.find(id),
  }),
  categories: query<CategoryView[]>({
    initialData: [],
    queryFn: () => api.categories(),
  }),
});
