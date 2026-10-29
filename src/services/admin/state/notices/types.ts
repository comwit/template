import type { Query } from "@comwit/state";
import type { PageRequest, Pageable } from "@/server/repository/types";
import type { ListFilter, NoticeInput, NoticeView } from "@/lib/course";
export type * from "@/lib/course";
export type ListArgs = { filter: ListFilter; pageable: PageRequest };
export type DomainState = {
  list: Query<Pageable<NoticeView>, ListArgs>;
  filter: ListFilter;
  page: number;
  draft: NoticeInput;
  editorOpen: boolean;
  isSaving: boolean;
  error: string | null;
};
export type DomainActions = {
  setFilter(filter: Partial<ListFilter>): void;
  setPage(page: number): void;
  refresh(): Promise<void>;
  openNew(): void;
  edit(id: string): Promise<void>;
  close(): void;
  setDraft(draft: NoticeInput): void;
  save(): Promise<void>;
  remove(id: string): Promise<void>;
};
