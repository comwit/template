import type * as Types from "@/lib/course";
import type { PageRequest, Pageable } from "@/server/repository/types";
export type * from "@/lib/course";
export interface CatalogAPI {
  findAll(filter: Types.CourseFilter, pageable: PageRequest): Promise<Pageable<Types.CourseSummary>>;
  find(id: string): Promise<Types.CourseView>;
  categories(): Promise<Types.CategoryView[]>;
  reviews(courseId: string, pageable: PageRequest): Promise<Pageable<Types.ReviewView>>;
  questions(courseId: string, lessonId: string | null, pageable: PageRequest): Promise<Pageable<Types.QuestionView>>;
  question(id: string): Promise<Types.QuestionView>;
  products(filter: Types.ProductFilter, pageable: PageRequest): Promise<Pageable<Types.ProductSummary>>;
  product(id: string): Promise<Types.ProductView>;
}
