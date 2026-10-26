import { model, query, keepPreviousData } from "@comwit/state";
import { adminInventory as api } from "@/services/admin/api/inventory";
import {
  emptyPage,
  type InventoryView,
  type OrderView,
  type MovementView,
  type CategoryView,
} from "@/lib/commerce";
import type { Pageable } from "@/server/repository/types";
import type { DomainState, ListArgs } from "./types";
export const domain = model<DomainState>({
  list: query<Pageable<InventoryView>, ListArgs>({
    initialData: emptyPage<InventoryView>(),
    queryFn: (arg) => api.findAll(arg.filter, arg.pageable),
    placeholderData: keepPreviousData,
  }),
  filter: { search: "", status: "" },
  page: 1,
  isSaving: false,
  error: null,
  pendingAdjustment: null,
  movements: query<Pageable<MovementView>, string>({
    initialData: emptyPage<MovementView>(),
    queryFn: (id) => api.movements(id, { page: 1, limit: 50 }),
  }),
  selectedId: null,
});
