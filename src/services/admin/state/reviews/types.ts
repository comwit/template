import type { Query } from "@comwit/state";
import type { PageRequest, Pageable } from "@/server/repository/types";
import type { ListFilter, ReviewView } from "@/lib/course";
export type * from "@/lib/course";
export type ListArgs = { filter: ListFilter; pageable: PageRequest };
export type DomainState = {
  list: Query<Pageable<ReviewView>, ListArgs>;
  filter: ListFilter;
  page: number;
  isSaving: boolean;
  error: string | null;
  /** 답글 다이얼로그가 열린 수강평 */
  selectedId: string | null;
};
export type DomainActions = {
  setFilter(filter: Partial<ListFilter>): void;
  setPage(page: number): void;
  refresh(): Promise<void>;
  select(id: string | null): void;
  reply(reviewId: string, reply: string): Promise<void>;
  setVisibility(reviewId: string, hidden: boolean): Promise<void>;
};
