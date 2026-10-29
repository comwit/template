import type { Query } from "@comwit/state";
import type { PageRequest, Pageable } from "@/server/repository/types";
import type {
  CourseInput,
  SectionInput,
  LessonInput,
  CourseSummary,
  CourseView,
  CategoryView,
  CategoryInput,
  InstructorView,
  InstructorInput,
  ListFilter,
} from "@/lib/course";
import type { ImageAsset } from "@/lib/image";
export type * from "@/lib/course";
export type ListArgs = { filter: ListFilter; pageable: PageRequest };
export type DomainState = {
  list: Query<Pageable<CourseSummary>, ListArgs>;
  detail: Query<CourseView | null, string>;
  categories: Query<CategoryView[]>;
  instructors: Query<InstructorView[]>;
  filter: ListFilter;
  page: number;
  draft: CourseInput;
  /** 편집 중인 강의 id. 새 강의는 null */
  editingId: string | null;
  isSaving: boolean;
  error: string | null;
};
export type DomainActions = {
  setFilter(filter: Partial<ListFilter>): void;
  setPage(page: number): void;
  refresh(): Promise<void>;
  startNew(): void;
  edit(id: string): Promise<void>;
  updateDraft(patch: Partial<CourseInput>): void;
  addSection(): void;
  removeSection(index: number): void;
  moveSection(index: number, direction: -1 | 1): void;
  updateSection(index: number, patch: Partial<SectionInput>): void;
  addLesson(sectionIndex: number): void;
  removeLesson(sectionIndex: number, lessonIndex: number): void;
  moveLesson(sectionIndex: number, lessonIndex: number, direction: -1 | 1): void;
  updateLesson(
    sectionIndex: number,
    lessonIndex: number,
    patch: Partial<LessonInput>,
  ): void;
  setThumbnail(image: ImageAsset | null): void;
  /** 저장 성공 시 강의 id, 실패 시 null */
  save(): Promise<string | null>;
  archive(id: string): Promise<void>;
  /** 성공 시 true */
  saveCategory(input: CategoryInput): Promise<boolean>;
  saveInstructor(input: InstructorInput): Promise<boolean>;
  removeInstructor(id: string): Promise<void>;
};
