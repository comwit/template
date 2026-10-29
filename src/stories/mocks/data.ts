import type {
  BannerView,
  CategoryView,
  CertificateView,
  CouponView,
  CourseView,
  DashboardView,
  EnrollmentView,
  InstructorView,
  LeadView,
  NoticeView,
  OrderView,
  PaymentRowView,
  PlayerView,
  ProductView,
  PurchaseView,
  QuestionView,
  RefundRequestView,
  ReviewView,
  SettingsView,
  StudentView,
} from "@/lib/course";
import type { User } from "@/services/app/api/user";
import {
  banner,
  bundle,
  category,
  certificate,
  coupon,
  course,
  dashboard,
  enrollment,
  instructor,
  lead,
  notice,
  order,
  payment,
  player,
  product,
  purchase,
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
  /** 디지털 상품(관리자 상세 기준). 공개 목록은 published 만 거른다. */
  products: ProductView[];
  purchases: PurchaseView[];
  leads: LeadView[];
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
    products: [product, bundle],
    purchases: [purchase],
    leads: [lead],
    orders: [order],
    payments: [
      {
        ...payment,
        customerEmail: order.customerEmail,
        itemTitle: order.itemTitle,
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
