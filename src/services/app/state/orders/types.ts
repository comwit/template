import type { Query } from "@comwit/state";
import type { PageRequest, Pageable } from "@/server/repository/types";
import type {
  ListFilter,
  OrderSummary,
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
  list: Query<Pageable<OrderSummary>, ListArgs>;
  filter: ListFilter;
  page: number;
  isSaving: boolean;
  error: string | null;
  detail: Query<OrderView | null, string>;
  selectedId: string | null;
};
export type DomainActions = {
  setFilter(filter: Partial<ListFilter>): void;
  setPage(page: number): void;
  refresh(): Promise<void>;
  select(id: string | null): void;
  cancel(id: string): Promise<void>;
};
