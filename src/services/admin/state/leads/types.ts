import type { Query } from "@comwit/state";
import type { PageRequest, Pageable } from "@/server/repository/types";
import type { LeadView, ListFilter } from "@/lib/course";
export type * from "@/lib/course";
export type ListArgs = { filter: ListFilter; pageable: PageRequest };
export type DomainState = {
  list: Query<Pageable<LeadView>, ListArgs>;
  /** status 에 리드 출처(free_course / free_product)를 담는다 */
  filter: ListFilter;
  page: number;
  isSaving: boolean;
  error: string | null;
};
export type DomainActions = {
  setFilter(filter: Partial<ListFilter>): void;
  setPage(page: number): void;
  refresh(): Promise<void>;
  /** 현재 페이지 행을 CSV 로 만들어 브라우저 다운로드를 건다 (서버 호출 없음) */
  downloadCsv(): void;
};
