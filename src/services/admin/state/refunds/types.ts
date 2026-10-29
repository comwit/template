import type { Query } from "@comwit/state";
import type { PageRequest, Pageable } from "@/server/repository/types";
import type {
  ListFilter,
  RefundRequestView,
  RefundDecisionInput,
} from "@/lib/course";
export type * from "@/lib/course";
export type ListArgs = { filter: ListFilter; pageable: PageRequest };
/** 승인/거절 다이얼로그가 열린 대상 */
export type DecisionTarget = { id: string; approve: boolean };
export type DomainState = {
  list: Query<Pageable<RefundRequestView>, ListArgs>;
  filter: ListFilter;
  page: number;
  selected: DecisionTarget | null;
  isSaving: boolean;
  error: string | null;
  pendingDecision: RefundDecisionInput | null;
};
export type DomainActions = {
  setFilter(filter: Partial<ListFilter>): void;
  setPage(page: number): void;
  refresh(): Promise<void>;
  select(target: DecisionTarget | null): void;
  decide(note: string): Promise<void>;
};
