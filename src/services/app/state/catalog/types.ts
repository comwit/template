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
  /** 세 번째 제네릭이 seed 모양: 목록 항목이 곧 상세라 `ProductView` 그대로다(파생 프로젝트는 요약 타입으로 좁힌다). */
  detail: Query<ProductView | null, string, ProductView>;
  categories: Query<CategoryView[]>;
};
export type DomainActions = {
  setFilter(filter: Partial<ListFilter>): void;
  setPage(page: number): void;
  refresh(): Promise<void>;
};
