import type {
  BannerView,
  CategoryView,
  CertificateView,
  CouponView,
  CourseView,
  DashboardView,
  EnrollmentView,
  InstructorView,
  NoticeView,
  OrderView,
  PaymentRowView,
  PlayerView,
  QuestionView,
  RefundRequestView,
  ReviewView,
  SettingsView,
  StudentView,
} from "@/lib/course";
import type { User } from "@/services/app/api/user";
import {
  banner,
  category,
  certificate,
  coupon,
  course,
  dashboard,
  enrollment,
  instructor,
  notice,
  order,
  payment,
  player,
  question,
  refundRequest,
  review,
  settings,
  student,
} from "../fixtures";

export type MockData = {
  courses: CourseView[];
  categories: CategoryView[];
  instructors: InstructorView[];
  students: StudentView[];
  enrollments: EnrollmentView[];
  /** 로그인 수강생의 강의실(한 강의 기준). 진도 저장이 여기에 반영된다. */
  player: PlayerView;
  certificates: CertificateView[];
  orders: OrderView[];
  payments: PaymentRowView[];
  refundRequests: RefundRequestView[];
  coupons: CouponView[];
  reviews: ReviewView[];
  questions: QuestionView[];
  notices: NoticeView[];
  banners: BannerView[];
  settings: SettingsView;
  dashboard: DashboardView;
  appUser: User | null;
  adminUser: User | null;
};

export function createMockData(): MockData {
  const user: User = {
    id: student.id,
    name: student.name,
    email: student.email,
    emailVerified: true,
    createdAt: new Date("2026-09-12T05:20:00Z"),
    updatedAt: new Date("2026-09-12T05:20:00Z"),
  };
  return structuredClone({
    courses: [course],
    categories: [category],
    instructors: [instructor],
    students: [student],
    enrollments: [enrollment],
    player,
    certificates: [certificate],
    orders: [order],
    payments: [
      {
        ...payment,
        customerEmail: order.customerEmail,
        courseTitle: order.courseTitle,
      },
    ],
    refundRequests: [refundRequest],
    coupons: [coupon],
    reviews: [review],
    questions: [question],
    notices: [notice],
    banners: [banner],
    settings,
    dashboard,
    appUser: user,
    adminUser: {
      ...user,
      id: "story-admin",
      name: "샘플 관리자",
      email: "admin@example.test",
    },
  });
}
