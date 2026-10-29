import type { Query } from "@comwit/state";
import type { PageRequest, Pageable } from "@/server/repository/types";
import type { ListFilter, QuestionView } from "@/lib/course";
export type * from "@/lib/course";
export type ListArgs = { filter: ListFilter; pageable: PageRequest };
export type DomainState = {
  list: Query<Pageable<QuestionView>, ListArgs>;
  filter: ListFilter;
  page: number;
  selectedId: string | null;
  detail: Query<QuestionView | null, string>;
  isSaving: boolean;
  error: string | null;
};
export type DomainActions = {
  setFilter(filter: Partial<ListFilter>): void;
  setPage(page: number): void;
  refresh(): Promise<void>;
  select(id: string | null): void;
  /** 성공하면 true — 폼이 입력을 비울지 결정한다. */
  answer(questionId: string, content: string): Promise<boolean>;
  setStatus(questionId: string, status: QuestionView["status"]): Promise<void>;
  setPinned(questionId: string, pinned: boolean): Promise<void>;
};
