import type { Query } from "@comwit/state";
import type { PageRequest, Pageable } from "@/server/repository/types";
import type {
  ListFilter,
  NotificationView,
  OrderView,
  ShipmentInput,
  RefundInput,
  StockInput,
  MovementView,
  CategoryView,
} from "@/lib/commerce";
export type * from "@/lib/commerce";
export type ListArgs = { filter: ListFilter; pageable: PageRequest };
export type DomainState = {
  list: Query<Pageable<NotificationView>, ListArgs>;
  filter: ListFilter;
  page: number;
  isSaving: boolean;
  error: string | null;
};
export type DomainActions = {
  setFilter(filter: Partial<ListFilter>): void;
  setPage(page: number): void;
  refresh(): Promise<void>;
  reconcile(id: string): Promise<void>;
  retry(id: string): Promise<void>;
  processPending(): Promise<void>;
};
