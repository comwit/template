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
  detail: Query<CourseView | null, string>;
  categories: Query<CategoryView[]>;
  reviews: Query<Pageable<ReviewView>, ReviewArgs>;
  questions: Query<Pageable<QuestionView>, QuestionArgs>;
  question: Query<QuestionView | null, string>;
  /** 디지털 상품(자료·전자책·묶음) 목록·상세. 강의와 같은 카탈로그 모델에 둔다. */
  products: Query<Pageable<ProductSummary>, ProductListArgs>;
  productFilter: ProductFilter;
  productPage: number;
  product: Query<ProductView | null, string>;
};
export type DomainActions = {
  setFilter(filter: Partial<CourseFilter>): void;
  setPage(page: number): void;
  refresh(): Promise<void>;
  /** 카드 → 상세 소프트 내비 직전에 detail 캐시를 채운다. */
  open(course: CourseSummary): void;
  /** 수강평·Q&A 작성 뒤 페이지가 부른다(community 는 catalog 모델을 모른다). */
  refreshReviews(): Promise<void>;
  refreshQuestions(): Promise<void>;
  refreshQuestion(): Promise<void>;
  setProductFilter(filter: Partial<ProductFilter>): void;
  setProductPage(page: number): void;
  /** 상품 카드 → 상세 소프트 내비 직전에 product 캐시를 채운다. */
  openProduct(product: ProductSummary): void;
};
