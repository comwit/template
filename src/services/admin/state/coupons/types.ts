import type { Query } from "@comwit/state";
import type { PageRequest, Pageable } from "@/server/repository/types";
import type {
  ListFilter,
  CouponView,
  CouponInput,
  CourseSummary,
  ProductSummary,
} from "@/lib/course";
export type * from "@/lib/course";
export type ListArgs = { filter: ListFilter; pageable: PageRequest };
export type DomainState = {
  list: Query<Pageable<CouponView>, ListArgs>;
  /** 쿠폰 적용 대상 강의 선택지 (공개 강의) */
  courses: Query<CourseSummary[]>;
  /** 쿠폰 적용 대상 상품 선택지 (공개 상품) */
  products: Query<ProductSummary[]>;
  filter: ListFilter;
  page: number;
  draft: CouponInput;
  editorOpen: boolean;
  isSaving: boolean;
  error: string | null;
};
export type DomainActions = {
  setFilter(filter: Partial<ListFilter>): void;
  setPage(page: number): void;
  refresh(): Promise<void>;
  openNew(): void;
  edit(coupon: CouponView): void;
  close(): void;
  setDraft(draft: CouponInput): void;
  save(): Promise<void>;
  setActive(id: string, active: boolean): Promise<void>;
};
