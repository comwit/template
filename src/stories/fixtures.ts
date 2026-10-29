import {
  formatDuration,
  formatMoney,
  formatOrderNumber,
  formatRating,
} from "@/lib/course";
import { kstCompactDateTime } from "@/lib/kst";
import type { ImageAsset } from "@/lib/image";
import type {
  BannerView,
  CategoryView,
  CertificateView,
  CouponView,
  CourseSummary,
  CourseView,
  DashboardView,
  EnrollmentView,
  InstructorView,
  LessonView,
  NoticeView,
  OrderView,
  PaymentView,
  PlayerView,
  QuestionView,
  QuoteView,
  RefundRequestView,
  ReviewView,
  SectionView,
  SettingsView,
  StudentView,
} from "@/lib/course";
import type { ListQuery } from "@/services/admin/_components/course";

// ── 공통 ─────────────────────────────────────────────────────────
const at = (iso: string) => kstCompactDateTime(new Date(iso));
export const thumbnail: ImageAsset = {
  url: "/window.svg",
  width: 1280,
  height: 720,
  thumb: "/window.svg",
};

export const category: CategoryView = {
  id: "0195aa00-2222-7222-8222-222222222222",
  name: "웹 개발",
  slug: "web",
};
export const instructor: InstructorView = {
  id: "0195aa00-2323-7222-8222-222222222223",
  name: "김민준",
  title: "10년 차 프런트엔드 개발자",
  bio: "스타트업과 대기업에서 웹 서비스를 만들어 왔습니다. 실무에서 바로 쓰는 패턴을 알려드립니다.",
  image: null,
  courseCount: 3,
};

// ── 강의·커리큘럼 ─────────────────────────────────────────────────
const sectionIds = [
  "0195aa00-1a01-7111-8111-111111111101",
  "0195aa00-1a02-7111-8111-111111111102",
];
const lessonIds = [
  "0195aa00-1b01-7111-8111-111111111201",
  "0195aa00-1b02-7111-8111-111111111202",
  "0195aa00-1b03-7111-8111-111111111203",
  "0195aa00-1b04-7111-8111-111111111204",
];
const previewVideo = {
  provider: "youtube" as const,
  url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  embedId: "dQw4w9WgXcQ",
};
const lesson = (
  index: number,
  sectionId: string,
  title: string,
  durationSeconds: number,
  options: Partial<LessonView> = {},
): LessonView => ({
  id: lessonIds[index],
  sectionId,
  title,
  position: index,
  video: null,
  hasVideo: true,
  durationSeconds,
  durationLabel: formatDuration(durationSeconds),
  isPreview: false,
  content: "",
  ...options,
});
/** 강의실·관리자가 보는 전체 커리큘럼(영상·자료 포함). */
export const fullSections: SectionView[] = [
  {
    id: sectionIds[0],
    title: "시작하기",
    position: 0,
    durationSeconds: 1200,
    durationLabel: formatDuration(1200),
    lessons: [
      lesson(0, sectionIds[0], "강의 소개와 개발 환경 준비", 480, {
        video: previewVideo,
        isPreview: true,
        content: "<p>Node.js 22 와 pnpm 을 설치하고 예제 저장소를 받습니다.</p>",
      }),
      lesson(1, sectionIds[0], "프로젝트 구조 한눈에 보기", 720, {
        video: {
          provider: "url",
          url: "https://media.example.test/course/02-structure.mp4",
          embedId: null,
        },
        content: "<p>app/, services/, server/ 폴더의 역할을 정리합니다.</p>",
      }),
    ],
  },
  {
    id: sectionIds[1],
    title: "라우팅과 데이터",
    position: 1,
    durationSeconds: 2100,
    durationLabel: formatDuration(2100),
    lessons: [
      lesson(2, sectionIds[1], "앱 라우터 기본기", 900, {
        video: {
          provider: "youtube",
          url: "https://youtu.be/ysz5S6PUM-U",
          embedId: "ysz5S6PUM-U",
        },
        content: "<p>레이아웃·페이지·로딩 UI 를 만듭니다.</p>",
      }),
      lesson(3, sectionIds[1], "서버 액션으로 데이터 다루기", 1200, {
        video: {
          provider: "youtube",
          url: "https://www.youtube.com/watch?v=jNQXAC9IVRw",
          embedId: "jNQXAC9IVRw",
        },
        content: "<p>폼 제출과 재검증(revalidate) 흐름을 실습합니다.</p>",
      }),
    ],
  },
];
/** 공개 상세: 미리보기 레슨만 영상·자료를 노출한다. */
export const publicSections: SectionView[] = fullSections.map((section) => ({
  ...section,
  lessons: section.lessons.map((item) =>
    item.isPreview ? item : { ...item, video: null, content: "" },
  ),
}));

export const courseSummary: CourseSummary = {
  id: "0195aa00-1111-7111-8111-111111111111",
  title: "실전 Next.js 앱 라우터 입문",
  slug: "nextjs-app-router-basics",
  summary: "라우팅부터 서버 액션까지, 실무 프로젝트 구조로 배우는 Next.js 첫걸음",
  thumbnail,
  categoryId: category.id,
  categoryName: category.name,
  instructorId: instructor.id,
  instructorName: instructor.name,
  level: "beginner",
  levelLabel: "입문",
  status: "published",
  statusLabel: "공개",
  price: 99000,
  discountPrice: 69000,
  salePrice: 69000,
  priceLabel: formatMoney(69000),
  originalPriceLabel: formatMoney(99000),
  discountRate: 30,
  discountEndsLabel: at("2026-12-31T23:59:00+09:00"),
  discountEndsAt: "2026-12-31T14:59:00.000Z",
  isFree: false,
  lessonCount: 4,
  totalDurationSeconds: 3300,
  totalDurationLabel: formatDuration(3300),
  enrollmentCount: 128,
  rating: 4.8,
  ratingLabel: formatRating(4.8 * 23, 23),
  reviewCount: 23,
  createdLabel: at("2026-09-01T09:00:00+09:00"),
  publishedLabel: at("2026-09-10T10:00:00+09:00"),
};
export const course: CourseView = {
  ...courseSummary,
  description:
    "<h2>이런 분께 추천해요</h2><p>React 는 알지만 Next.js 앱 라우터가 낯선 분, 실무 폴더 구조가 궁금한 분.</p><h2>배우는 내용</h2><ul><li>레이아웃·페이지·로딩 UI</li><li>서버 액션과 재검증</li><li>배포까지 한 번에</li></ul>",
  instructor,
  sections: publicSections,
  enrollment: null,
};

// ── 수강생·수강 ───────────────────────────────────────────────────
export const student: StudentView = {
  id: "0195aa00-9999-7999-8999-999999999999",
  name: "이서연",
  email: "seoyeon@example.test",
  emailVerified: true,
  enrollmentCount: 2,
  completedCount: 1,
  createdLabel: at("2026-09-12T14:20:00+09:00"),
};
export const enrollment: EnrollmentView = {
  id: "0195aa00-5555-7555-8555-555555555555",
  courseId: course.id,
  courseTitle: course.title,
  courseSlug: course.slug,
  thumbnail,
  userId: student.id,
  userEmail: student.email,
  userName: student.name,
  orderId: "0195aa00-3333-7333-8333-333333333333",
  source: "order",
  sourceLabel: "결제",
  status: "active",
  statusLabel: "수강 중",
  progressPercent: 50,
  completedLessons: 2,
  lessonCount: 4,
  lastLessonId: lessonIds[2],
  startedLabel: at("2026-10-14T10:00:00+09:00"),
  completedLabel: null,
  expiresLabel: null,
  certificateId: null,
};
export const player: PlayerView = {
  enrollmentId: enrollment.id,
  course: { id: course.id, title: course.title, slug: course.slug },
  sections: fullSections,
  progress: [
    { lessonId: lessonIds[0], positionSeconds: 480, completed: true },
    { lessonId: lessonIds[1], positionSeconds: 720, completed: true },
    { lessonId: lessonIds[2], positionSeconds: 310, completed: false },
  ],
  progressPercent: 50,
  completedLessons: 2,
  lessonCount: 4,
  lastLessonId: lessonIds[2],
  certificateId: null,
};
export const certificate: CertificateView = {
  id: "0195aa00-cccc-7ccc-8ccc-cccccccccccc",
  number: "CERT-2026-000128",
  enrollmentId: enrollment.id,
  courseId: course.id,
  courseTitle: course.title,
  instructorName: instructor.name,
  userName: student.name,
  userEmail: student.email,
  totalDurationLabel: course.totalDurationLabel,
  issuedLabel: at("2026-10-20T18:30:00+09:00"),
  issuedAt: "2026-10-20T09:30:00.000Z",
};

// ── 주문·결제·환불 ─────────────────────────────────────────────────
const orderNumber = "order-0195aa00-3333-7333-8333-333333333333";
export const payment: PaymentView = {
  id: "0195aa00-4444-7444-8444-444444444444",
  orderId: "0195aa00-3333-7333-8333-333333333333",
  providerOrderId: orderNumber,
  displayOrderNumber: formatOrderNumber(orderNumber),
  status: "done",
  statusLabel: "결제 완료",
  amount: 69000,
  amountLabel: formatMoney(69000),
  refundedAmount: 0,
  refundedLabel: "0원",
  refundableAmount: 69000,
  mode: "test",
  method: "카드",
  receiptUrl: null,
  lastError: null,
  pendingRefundId: null,
  createdLabel: at("2026-10-14T10:00:00+09:00"),
};
export const order: OrderView = {
  id: payment.orderId,
  number: orderNumber,
  displayNumber: formatOrderNumber(orderNumber),
  customerId: student.id,
  customerEmail: student.email,
  courseId: course.id,
  courseTitle: course.title,
  status: "confirmed",
  statusLabel: "결제 완료",
  paymentStatus: "paid",
  paymentLabel: "결제 완료",
  listPrice: 99000,
  discount: 30000,
  couponDiscount: 0,
  couponCode: null,
  total: 69000,
  totalLabel: formatMoney(69000),
  createdLabel: at("2026-10-14T09:58:00+09:00"),
  expiresLabel: at("2026-10-14T10:28:00+09:00"),
  listPriceLabel: formatMoney(99000),
  discountLabel: formatMoney(30000),
  couponDiscountLabel: formatMoney(0),
  payment,
  refunds: [],
  refundRequest: null,
  canRequestRefund: true,
  enrollmentId: enrollment.id,
  history: [
    {
      id: "history-1",
      action: "주문 생성",
      createdLabel: at("2026-10-14T09:58:00+09:00"),
    },
    {
      id: "history-2",
      action: "결제 승인",
      createdLabel: at("2026-10-14T10:00:00+09:00"),
    },
    {
      id: "history-3",
      action: "수강 시작",
      createdLabel: at("2026-10-14T10:00:00+09:00"),
    },
  ],
};
export const refundRequest: RefundRequestView = {
  id: "0195aa00-6666-7666-8666-666666666666",
  orderId: order.id,
  displayNumber: order.displayNumber,
  customerEmail: order.customerEmail,
  courseTitle: order.courseTitle,
  amount: order.total,
  amountLabel: order.totalLabel,
  reason: "기대했던 내용과 달라 환불을 요청합니다. 2강까지만 들었습니다.",
  status: "pending",
  statusLabel: "대기",
  note: "",
  createdLabel: at("2026-10-16T11:20:00+09:00"),
  decidedLabel: null,
};
export const coupon: CouponView = {
  id: "0195aa00-7777-7777-8777-777777777777",
  code: "WELCOME10",
  name: "첫 수강 10% 할인",
  type: "percent",
  typeLabel: "정률",
  value: 10,
  valueLabel: "10%",
  minAmount: 30000,
  minAmountLabel: formatMoney(30000),
  maxDiscount: 20000,
  courseId: null,
  courseTitle: null,
  startsLabel: at("2026-10-01T00:00:00+09:00"),
  endsLabel: at("2026-12-31T23:59:00+09:00"),
  startsAt: "2026-09-30T15:00:00.000Z",
  endsAt: "2026-12-31T14:59:00.000Z",
  usageLimit: 100,
  usedCount: 12,
  usageLabel: "12/100회",
  perUserLimit: 1,
  active: true,
  status: "active",
  statusLabel: "사용 가능",
  createdLabel: at("2026-09-28T15:00:00+09:00"),
};
export const quote: QuoteView = {
  courseId: course.id,
  courseTitle: course.title,
  listPrice: 99000,
  listPriceLabel: formatMoney(99000),
  discount: 30000,
  couponCode: null,
  couponDiscount: 0,
  couponDiscountLabel: formatMoney(0),
  couponError: null,
  total: 69000,
  totalLabel: formatMoney(69000),
  isFree: false,
  alreadyEnrolled: false,
};

// ── 수강평·Q&A ───────────────────────────────────────────────────
export const review: ReviewView = {
  id: "0195aa00-8888-7888-8888-888888888888",
  courseId: course.id,
  courseTitle: course.title,
  userId: student.id,
  userName: student.name,
  rating: 5,
  content:
    "폴더 구조를 왜 이렇게 나누는지 이유까지 설명해 주셔서 회사 프로젝트에 바로 적용했어요.",
  status: "visible",
  statusLabel: "공개",
  adminReply: null,
  adminRepliedLabel: null,
  createdLabel: at("2026-10-18T21:10:00+09:00"),
};
export const question: QuestionView = {
  id: "0195aa00-8a8a-7888-8888-888888888801",
  courseId: course.id,
  courseTitle: course.title,
  lessonId: lessonIds[3],
  lessonTitle: fullSections[1].lessons[1].title,
  userId: student.id,
  userName: student.name,
  title: "서버 액션에서 revalidatePath 가 안 먹어요",
  content:
    "<p>폼 제출 후 목록이 갱신되지 않습니다. 강의 영상과 같은 코드인데 어디를 확인해야 할까요?</p>",
  status: "answered",
  statusLabel: "답변 완료",
  pinned: false,
  commentCount: 1,
  createdLabel: at("2026-10-19T09:40:00+09:00"),
  comments: [
    {
      id: "0195aa00-8a8a-7888-8888-888888888802",
      questionId: "0195aa00-8a8a-7888-8888-888888888801",
      authorType: "admin",
      authorName: instructor.name,
      content:
        "<p>클라이언트에서 경로를 <code>/items</code> 로 넘기고 있는지 확인해 보세요. 동적 세그먼트는 실제 경로여야 합니다.</p>",
      isAnswer: true,
      createdLabel: at("2026-10-19T13:05:00+09:00"),
    },
  ],
};

// ── 공지·배너 ────────────────────────────────────────────────────
export const notice: NoticeView = {
  id: "0195aa00-abab-7aaa-8aaa-aaaaaaaaaaaa",
  title: "10월 신규 강의 오픈 및 할인 안내",
  content:
    "<p>10월 한 달간 신규 강의를 30% 할인합니다. 수강 기간 제한은 없습니다.</p>",
  pinned: true,
  status: "published",
  statusLabel: "공개",
  publishedLabel: at("2026-10-01T10:00:00+09:00"),
  createdLabel: at("2026-09-30T17:30:00+09:00"),
};
export const banner: BannerView = {
  id: "0195aa00-bbbb-7bbb-8bbb-bbbbbbbbbbbb",
  title: "가을 맞이 전 강의 30% 할인",
  image: { url: "/globe.svg", width: 1600, height: 600, thumb: "/globe.svg" },
  linkUrl: "/courses",
  position: 0,
  active: true,
  startsLabel: at("2026-10-01T00:00:00+09:00"),
  endsLabel: at("2026-10-31T23:59:00+09:00"),
  startsAt: "2026-09-30T15:00:00.000Z",
  endsAt: "2026-10-31T14:59:00.000Z",
};

// ── 대시보드·설정 ────────────────────────────────────────────────
export const dashboard: DashboardView = {
  courses: 12,
  students: 348,
  enrollments: 512,
  activeEnrollments: 431,
  grossLabel: "28,560,000원",
  netLabel: "27,320,000원",
  refundedLabel: "1,240,000원",
  needsReview: 2,
  pendingRefunds: 1,
  openQuestions: 4,
  completionRate: 38,
  recent: [order],
  monthly: [
    { month: "2026-05", sales: 3120000, salesLabel: "3,120,000원", enrollments: 58 },
    { month: "2026-06", sales: 3980000, salesLabel: "3,980,000원", enrollments: 71 },
    { month: "2026-07", sales: 4450000, salesLabel: "4,450,000원", enrollments: 83 },
    { month: "2026-08", sales: 5210000, salesLabel: "5,210,000원", enrollments: 96 },
    { month: "2026-09", sales: 5690000, salesLabel: "5,690,000원", enrollments: 104 },
    { month: "2026-10", sales: 6110000, salesLabel: "6,110,000원", enrollments: 100 },
  ],
  topCourses: [
    { id: course.id, title: course.title, enrollments: 128, completionRate: 42 },
    {
      id: "0195aa00-1111-7111-8111-111111111112",
      title: "TypeScript 타입 설계 패턴",
      enrollments: 96,
      completionRate: 35,
    },
    {
      id: "0195aa00-1111-7111-8111-111111111113",
      title: "디자인 시스템 구축 실무",
      enrollments: 64,
      completionRate: 51,
    },
  ],
};
export const settings: SettingsView = {
  name: "샘플 아카데미",
  mode: "test",
  orderExpiryMinutes: 30,
  refundWindowDays: 7,
  refundProgressLimit: 30,
  paymentReady: false,
  databaseReady: true,
  storageReady: true,
  appUrl: "https://academy.example.test",
};

export function listQuery<T>(
  items: T[],
  state: "ready" | "loading" | "error" = "ready",
): ListQuery<T> {
  return {
    data: {
      items,
      total: items.length,
      page: 1,
      limit: 10,
      totalPages: items.length ? 1 : 0,
    },
    isLoading: state === "loading",
    isFetching: false,
    isSuccess: state === "ready",
    isError: state === "error",
    error: state === "error" ? "데이터를 불러오지 못했습니다." : null,
  };
}
