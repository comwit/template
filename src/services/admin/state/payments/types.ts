import type { Query } from "@comwit/state";
import type { PageRequest, Pageable } from "@/server/repository/types";
import type { ListFilter, PaymentRowView } from "@/lib/course";
export type * from "@/lib/course";
export type ListArgs = { filter: ListFilter; pageable: PageRequest };
export type DomainState = {
  list: Query<Pageable<PaymentRowView>, ListArgs>;
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
  retryRefund(id: string): Promise<void>;
  reconcilePending(): Promise<void>;
};
