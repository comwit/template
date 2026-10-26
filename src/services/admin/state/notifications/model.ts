import { model, query, keepPreviousData } from "@comwit/state";
import { adminNotifications as api } from "@/services/admin/api/notifications";
import {
  emptyPage,
  type NotificationView,
  type OrderView,
  type MovementView,
  type CategoryView,
} from "@/lib/commerce";
import type { Pageable } from "@/server/repository/types";
import type { DomainState, ListArgs } from "./types";
export const domain = model<DomainState>({
  list: query<Pageable<NotificationView>, ListArgs>({
    initialData: emptyPage<NotificationView>(),
    queryFn: (arg) => api.findAll(arg.filter, arg.pageable),
    placeholderData: keepPreviousData,
  }),
  filter: { search: "", status: "" },
  page: 1,
  isSaving: false,
  error: null,
});
