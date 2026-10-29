import type * as Types from "@/lib/course";
import type { PageRequest, Pageable } from "@/server/repository/types";
export type * from "@/lib/course";
export interface AdminCoursesAPI {
  findAll(filter: Types.ListFilter, pageable: PageRequest): Promise<Pageable<Types.CourseSummary>>;
  find(id: string): Promise<Types.CourseView>;
  save(request: Types.CourseInput): Promise<string>;
  archive(id: string): Promise<void>;
  categories(): Promise<Types.CategoryView[]>;
  saveCategory(request: Types.CategoryInput): Promise<string>;
  instructors(): Promise<Types.InstructorView[]>;
  saveInstructor(request: Types.InstructorInput): Promise<string>;
  removeInstructor(id: string): Promise<void>;
}
