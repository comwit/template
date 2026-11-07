import type * as Types from "@/lib/course";
import type { PageRequest, Pageable } from "@/server/repository/types";
export type * from "@/lib/course";
export interface CatalogAPI {
  findAll(filter: Types.CourseFilter, pageable: PageRequest): Promise<Pageable<Types.CourseSummary>>;
  /** 없는·비공개 강의는 null. 상세 query 가 "없는 강의"로 그린다. */
  find(id: string): Promise<Types.CourseView | null>;
  categories(): Promise<Types.CategoryView[]>;
  reviews(courseId: string, pageable: PageRequest): Promise<Pageable<Types.ReviewView>>;
  questions(courseId: string, lessonId: string | null, pageable: PageRequest): Promise<Pageable<Types.QuestionView>>;
  question(id: string): Promise<Types.QuestionView>;
  products(filter: Types.ProductFilter, pageable: PageRequest): Promise<Pageable<Types.ProductSummary>>;
  /** 없는·비공개 상품은 null. */
  product(id: string): Promise<Types.ProductView | null>;
}
