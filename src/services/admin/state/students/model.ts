import { model, query, keepPreviousData } from "@comwit/state";
import { adminStudents } from "@/services/admin/api/students";
import { adminCourses } from "@/services/admin/api/courses";
import { adminProducts } from "@/services/admin/api/products";
import {
  emptyPage,
  type StudentView,
  type EnrollmentView,
  type ProgressDetailView,
  type PurchaseView,
  type CourseSummary,
  type ProductSummary,
} from "@/lib/course";
import type { Pageable } from "@/server/repository/types";
import type { DomainState, StudentArgs, EnrollmentArgs } from "./types";
export const domain = model<DomainState>({
  students: query<Pageable<StudentView>, StudentArgs>({
    initialData: emptyPage<StudentView>(),
    queryFn: (args) => adminStudents.findAll(args.filter, args.pageable),
    placeholderData: keepPreviousData,
  }),
  studentFilter: { search: "", status: "" },
  studentPage: 1,
  enrollments: query<Pageable<EnrollmentView>, EnrollmentArgs>({
    initialData: emptyPage<EnrollmentView>(),
    queryFn: (args) => adminStudents.enrollments(args.filter, args.pageable),
    placeholderData: keepPreviousData,
  }),
  enrollmentFilter: { search: "", status: "", courseId: "" },
  enrollmentPage: 1,
  courses: query<CourseSummary[]>({
    initialData: [],
    queryFn: async () =>
      (
        await adminCourses.findAll(
          { search: "", status: "" },
          { page: 1, limit: 100 },
        )
      ).items,
  }),
  purchases: query<Pageable<PurchaseView>, EnrollmentArgs>({
    initialData: emptyPage<PurchaseView>(),
    queryFn: (args) => adminStudents.purchases(args.filter, args.pageable),
    placeholderData: keepPreviousData,
  }),
  purchaseFilter: { search: "", status: "", courseId: "" },
  purchasePage: 1,
  products: query<ProductSummary[]>({
    initialData: [],
    queryFn: async () =>
      (
        await adminProducts.findAll(
          { search: "", status: "" },
          { page: 1, limit: 100 },
        )
      ).items,
  }),
  progress: query<ProgressDetailView[], string>({
    initialData: [],
    queryFn: (enrollmentId) => adminStudents.progress(enrollmentId),
  }),
  progressId: null,
  isSaving: false,
  error: null,
});
