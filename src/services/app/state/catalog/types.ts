import type { Query } from "@comwit/state";
import type { PageRequest, Pageable } from "@/server/repository/types";
import type {
  CourseFilter,
  CourseSummary,
  CourseView,
  CategoryView,
  ReviewView,
  QuestionView,
  ProductFilter,
  ProductSummary,
  ProductView,
} from "@/lib/course";
export type * from "@/lib/course";
export type ListArgs = { filter: CourseFilter; pageable: PageRequest };
export type ProductListArgs = { filter: ProductFilter; pageable: PageRequest };
export type ReviewArgs = { courseId: string; page: number };
export type QuestionArgs = {
  courseId: string;
  lessonId: string | null;
  page: number;
};
export type DomainState = {
  list: Query<Pageable<CourseSummary>, ListArgs>;
  filter: CourseFilter;
  page: number;
  isSaving: boolean;
  error: string | null;
  /**
   * 강의 상세. 목록 항목(CourseSummary)이 seed 라 목록에서 들어오면 바로 그리고(`isPartial`),
   * 전체(CourseView)는 백그라운드로 받는다. `null` 은 없는·비공개 강의(state.ai.md → Detail seed).
   */
  detail: Query<CourseView | null, string, CourseSummary>;
  categories: Query<CategoryView[]>;
  reviews: Query<Pageable<ReviewView>, ReviewArgs>;
  questions: Query<Pageable<QuestionView>, QuestionArgs>;
  question: Query<QuestionView | null, string>;
  /** 디지털 상품(자료·전자책·묶음) 목록·상세. 강의와 같은 카탈로그 모델에 둔다. */
  products: Query<Pageable<ProductSummary>, ProductListArgs>;
  productFilter: ProductFilter;
  productPage: number;
  /** 상품 상세. detail 과 같은 규칙: products 목록 항목(ProductSummary)이 seed. */
  product: Query<ProductView | null, string, ProductSummary>;
};
export type DomainActions = {
  setFilter(filter: Partial<CourseFilter>): void;
  setPage(page: number): void;
  refresh(): Promise<void>;
  /** 상세 업그레이드가 실패했을 때 화면의 재시도 버튼이 부른다. seed 만 있는 키도 다시 받는다. */
  refreshDetail(): Promise<void>;
  /** 수강평·Q&A 작성 뒤 페이지가 부른다(community 는 catalog 모델을 모른다). */
  refreshReviews(): Promise<void>;
  refreshQuestions(): Promise<void>;
  refreshQuestion(): Promise<void>;
  setProductFilter(filter: Partial<ProductFilter>): void;
  setProductPage(page: number): void;
  /** 상품 상세 업그레이드 실패 뒤 재시도. */
  refreshProduct(): Promise<void>;
};
