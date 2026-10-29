import type { Query } from "@comwit/state";
import type { PageRequest, Pageable } from "@/server/repository/types";
import type {
  ListFilter,
  EnrollmentFilter,
  StudentView,
  EnrollmentView,
  ProgressDetailView,
  GrantInput,
  CourseSummary,
} from "@/lib/course";
export type * from "@/lib/course";
export type StudentArgs = { filter: ListFilter; pageable: PageRequest };
export type EnrollmentArgs = { filter: EnrollmentFilter; pageable: PageRequest };
export type DomainState = {
  students: Query<Pageable<StudentView>, StudentArgs>;
  studentFilter: ListFilter;
  studentPage: number;
  enrollments: Query<Pageable<EnrollmentView>, EnrollmentArgs>;
  enrollmentFilter: EnrollmentFilter;
  enrollmentPage: number;
  /** 수강 권한 부여·필터용 강의 목록 */
  courses: Query<CourseSummary[]>;
  progress: Query<ProgressDetailView[], string>;
  /** 진도 다이얼로그가 열린 수강 id */
  progressId: string | null;
  isSaving: boolean;
  error: string | null;
};
export type DomainActions = {
  setStudentFilter(filter: Partial<ListFilter>): void;
  setStudentPage(page: number): void;
  setEnrollmentFilter(filter: Partial<EnrollmentFilter>): void;
  setEnrollmentPage(page: number): void;
  refresh(): Promise<void>;
  /** 성공 시 true */
  grant(input: GrantInput): Promise<boolean>;
  revoke(enrollmentId: string, reason: string): Promise<boolean>;
  openProgress(enrollmentId: string | null): void;
  refreshProgress(): Promise<void>;
};
