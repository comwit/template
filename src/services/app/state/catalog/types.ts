import type { Query } from "@comwit/state";
import type { PageRequest, Pageable } from "@/server/repository/types";
import type {
  ListFilter,
  ProductView,
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
  list: Query<Pageable<ProductView>, ListArgs>;
  filter: ListFilter;
  page: number;
  isSaving: boolean;
  error: string | null;
  detail: Query<ProductView | null, string>;
  categories: Query<CategoryView[]>;
};
export type DomainActions = {
  setFilter(filter: Partial<ListFilter>): void;
  setPage(page: number): void;
  refresh(): Promise<void>;
  open(product: ProductView): void;
};
