import "server-only";
import { kstCompactDateTime } from "@/lib/kst";
import {
  formatDuration,
  formatMoney,
  formatOrderNumber,
  formatRating,
  salePrice,
  youtubeVideoId,
  type BannerView,
  type CertificateView,
  type CommentView,
  type CouponView,
  type DashboardView,
  type CourseSummary,
  type CourseView,
  type EnrollmentView,
  type InstructorView,
  type LessonView,
  type NoticeView,
  type OrderSummary,
  type OrderView,
  type PaymentView,
  type PlayerView,
  type ProgressDetailView,
  type QuestionView,
  type QuoteView,
  type RefundRequestView,
  type ReviewView,
  type SectionView,
  type SettingsView,
  type StudentView,
  type VideoInput,
  type VideoView,
} from "@/lib/course";
import type { ImageAsset } from "@/lib/image";
import type {
  banners,
  instructors,
  notices,
  orders,
  payments,
  questionComments,
  refundRequests,
} from "@/server/db/schema";
import type {
  catalogRepository,
  communityRepository,
  couponRepository,
  enrollmentRepository,
  operationsRepository,
  orderRepository,
  paymentRepository,
} from "@/server/repository";
import type { CurriculumRow } from "@/server/repository/catalog";

const labels: Record<string, string> = {
  draft: "초안",
  published: "공개",
  archived: "비공개",
  beginner: "입문",
  intermediate: "중급",
  advanced: "고급",
  pending: "대기",
  confirmed: "결제 완료",
  cancelled: "취소",
  expired: "만료",
  refunded: "환불",
  free: "무료",
  unpaid: "미결제",
  processing: "승인 중",
  paid: "결제 완료",
  failed: "실패",
  review: "확인 필요",
  ready: "결제 대기",
  confirming: "승인 확인 중",
  done: "결제 완료",
  unknown: "확인 필요",
  succeeded: "완료",
  approved: "승인",
  rejected: "거절",
  active: "수강 중",
  revoked: "회수",
  order: "결제",
  manual: "수동 부여",
  visible: "공개",
  hidden: "숨김",
  open: "답변 대기",
  answered: "답변 완료",
  closed: "닫힘",
  percent: "정률",
  fixed: "정액",
  inactive: "중지",
  exhausted: "소진",
};
const historyLabels: Record<string, string> = {
  "order.created": "주문 생성",
  "order.cancelled": "주문 취소",
  "order.expired": "결제 대기 만료",
  "payment.approved": "결제 승인",
  "payment.failed": "결제 실패",
  "payment.balance_synced": "결제 잔액 확인",
  "refund.requested": "환불 요청",
  "refund.succeeded": "환불 완료",
  "refund.request_created": "환불 신청 접수",
  "refund.request_rejected": "환불 신청 거절",
  "enrollment.opened": "수강 시작",
};
export const statusLabel = (status: string) => labels[status] ?? status;
const parseImage = (raw: string | null) =>
  raw ? (JSON.parse(raw) as ImageAsset) : null;
const dateLabel = (date: Date | null | undefined) =>
  date ? kstCompactDateTime(date) : null;

export function presentVideo(raw: string | null): VideoView | null {
  if (!raw) return null;
  const video = JSON.parse(raw) as VideoInput;
  return {
    ...video,
    embedId: video.provider === "youtube" ? youtubeVideoId(video.url) : null,
  };
}
/** 공개 상세는 미리보기 레슨만 영상을 노출한다. 강의실·관리자는 전부 노출한다. */
export function presentSections(
  rows: CurriculumRow[],
  access: "public" | "full",
): SectionView[] {
  return rows.map((section) => ({
    id: section.id,
    title: section.title,
    position: section.position,
    durationSeconds: section.lessons.reduce((s, l) => s + l.durationSeconds, 0),
    durationLabel: formatDuration(
      section.lessons.reduce((s, l) => s + l.durationSeconds, 0),
    ),
    lessons: section.lessons.map(
      (lesson): LessonView => ({
        id: lesson.id,
        sectionId: lesson.sectionId,
        title: lesson.title,
        position: lesson.position,
        video:
          access === "full" || lesson.isPreview
            ? presentVideo(lesson.video)
            : null,
        hasVideo: Boolean(lesson.video),
        durationSeconds: lesson.durationSeconds,
        durationLabel: formatDuration(lesson.durationSeconds),
        isPreview: lesson.isPreview,
        content: access === "full" || lesson.isPreview ? lesson.content : "",
      }),
    ),
  }));
}
export function presentInstructor(
  row: typeof instructors.$inferSelect & { courseCount?: number },
): InstructorView {
  return {
    id: row.id,
    name: row.name,
    title: row.title,
    bio: row.bio,
    image: parseImage(row.image),
    ...(row.courseCount !== undefined ? { courseCount: row.courseCount } : {}),
  };
}
export function presentCourse(
  course: Awaited<ReturnType<typeof catalogRepository.findAll>>["items"][number],
): CourseSummary {
  const sale = salePrice(course);
  const discounting = sale < course.price;
  return {
    id: course.id,
    title: course.title,
    slug: course.slug,
    summary: course.summary,
    thumbnail: parseImage(course.thumbnail),
    categoryId: course.categoryId,
    categoryName: course.category?.name ?? null,
    instructorId: course.instructorId,
    instructorName: course.instructor?.name ?? null,
    level: course.level,
    levelLabel: statusLabel(course.level),
    status: course.status,
    statusLabel: statusLabel(course.status),
    price: course.price,
    discountPrice: course.discountPrice,
    salePrice: sale,
    priceLabel: formatMoney(sale),
    originalPriceLabel: discounting ? formatMoney(course.price) : null,
    discountRate: discounting
      ? Math.round(((course.price - sale) / course.price) * 100)
      : 0,
    discountEndsLabel: discounting ? dateLabel(course.discountEndsAt) : null,
    discountEndsAt:
      course.discountPrice !== null
        ? (course.discountEndsAt?.toISOString() ?? null)
        : null,
    isFree: sale === 0,
    lessonCount: course.lessonCount,
    totalDurationSeconds: course.totalDurationSeconds,
    totalDurationLabel: formatDuration(course.totalDurationSeconds),
    enrollmentCount: course.enrollmentCount,
    rating: course.reviewCount
      ? Math.round((course.ratingSum / course.reviewCount) * 10) / 10
      : null,
    ratingLabel: formatRating(course.ratingSum, course.reviewCount),
    reviewCount: course.reviewCount,
    createdLabel: kstCompactDateTime(course.createdAt),
    publishedLabel: dateLabel(course.publishedAt),
  };
}
export function presentCourseDetail(
  course: Awaited<ReturnType<typeof catalogRepository.findById>>,
  access: "public" | "full",
  enrollment: CourseView["enrollment"] = null,
): CourseView {
  return {
    ...presentCourse(course),
    description: course.description,
    instructor: course.instructor ? presentInstructor(course.instructor) : null,
    sections: presentSections(course.sections, access),
    enrollment,
  };
}
export function presentEnrollment(
  row: Awaited<ReturnType<typeof enrollmentRepository.findAll>>["items"][number],
): EnrollmentView {
  return {
    id: row.id,
    courseId: row.course.id,
    courseTitle: row.course.title,
    courseSlug: row.course.slug,
    thumbnail: parseImage(row.course.thumbnail),
    userId: row.user.id,
    userEmail: row.user.email,
    userName: row.user.name ?? "",
    orderId: row.orderId,
    source: row.source,
    sourceLabel: statusLabel(row.source),
    status: row.status,
    statusLabel: statusLabel(row.status),
    progressPercent: row.progressPercent,
    completedLessons: row.completedLessons,
    lessonCount: row.course.lessonCount,
    lastLessonId: row.lastLessonId,
    startedLabel: kstCompactDateTime(row.createdAt),
    completedLabel: dateLabel(row.completedAt),
    expiresLabel: dateLabel(row.expiresAt),
    certificateId: row.certificateId,
  };
}
export function presentPlayer(
  data: Awaited<ReturnType<typeof enrollmentRepository.player>>,
): PlayerView {
  return {
    enrollmentId: data.enrollment.id,
    course: { id: data.course.id, title: data.course.title, slug: data.course.slug },
    sections: presentSections(data.sections, "full"),
    progress: data.progress.map((p) => ({
      lessonId: p.lessonId,
      positionSeconds: p.positionSeconds,
      completed: p.completed,
    })),
    progressPercent: data.enrollment.progressPercent,
    completedLessons: data.enrollment.completedLessons,
    lessonCount: data.course.lessonCount,
    lastLessonId: data.enrollment.lastLessonId,
    certificateId: data.certificateId,
  };
}
export function presentCertificate(
  row: Awaited<ReturnType<typeof enrollmentRepository.findCertificate>>,
): CertificateView {
  return {
    id: row.certificate.id,
    number: row.certificate.number,
    enrollmentId: row.certificate.enrollmentId,
    courseId: row.certificate.courseId,
    courseTitle: row.courseTitle,
    instructorName: row.instructorName,
    userName: row.userName ?? "",
    userEmail: row.userEmail,
    totalDurationLabel: formatDuration(row.totalDurationSeconds),
    issuedLabel: kstCompactDateTime(row.certificate.issuedAt),
    issuedAt: row.certificate.issuedAt.toISOString(),
  };
}
export function presentOrder(order: typeof orders.$inferSelect): OrderSummary {
  return {
    id: order.id,
    number: order.number,
    displayNumber: formatOrderNumber(order.number),
    customerId: order.customerId,
    customerEmail: order.customerEmail,
    courseId: order.courseId,
    courseTitle: order.courseTitle,
    status: order.status,
    statusLabel: statusLabel(order.status),
    paymentStatus: order.paymentStatus,
    paymentLabel: statusLabel(order.paymentStatus),
    listPrice: order.listPrice,
    discount: order.discount,
    couponDiscount: order.couponDiscount,
    couponCode: order.couponCode,
    total: order.total,
    totalLabel: formatMoney(order.total),
    createdLabel: kstCompactDateTime(order.createdAt),
    expiresLabel: kstCompactDateTime(order.expiresAt),
  };
}
export function presentPayment(
  payment: typeof payments.$inferSelect,
): PaymentView {
  return {
    id: payment.id,
    orderId: payment.orderId,
    providerOrderId: payment.providerOrderId,
    displayOrderNumber: formatOrderNumber(payment.providerOrderId),
    status: payment.status,
    statusLabel: statusLabel(payment.status),
    amount: payment.amount,
    amountLabel: formatMoney(payment.amount),
    refundedAmount: payment.refundedAmount,
    refundedLabel: formatMoney(payment.refundedAmount),
    refundableAmount: payment.amount - payment.refundedAmount,
    mode: payment.mode,
    method: payment.method ?? "—",
    receiptUrl: payment.receiptUrl,
    lastError: payment.lastError,
    pendingRefundId: payment.pendingRefundId,
    createdLabel: kstCompactDateTime(payment.createdAt),
  };
}
export function presentPaymentRow(
  row: Awaited<ReturnType<typeof paymentRepository.findAll>>["items"][number],
): PaymentView & { customerEmail: string; courseTitle: string } {
  return {
    ...presentPayment(row.payment),
    customerEmail: row.customerEmail,
    courseTitle: row.courseTitle,
  };
}
export function presentRefundRequest(
  request: typeof refundRequests.$inferSelect,
  order: typeof orders.$inferSelect,
): RefundRequestView {
  return {
    id: request.id,
    orderId: order.id,
    displayNumber: formatOrderNumber(order.number),
    customerEmail: order.customerEmail,
    courseTitle: order.courseTitle,
    amount: order.total,
    amountLabel: formatMoney(order.total),
    reason: request.reason,
    status: request.status,
    statusLabel: statusLabel(request.status),
    note: request.note,
    createdLabel: kstCompactDateTime(request.createdAt),
    decidedLabel: dateLabel(request.decidedAt),
  };
}
export function presentOrderDetail(
  order: Awaited<ReturnType<typeof orderRepository.findById>>,
  admin = false,
): OrderView {
  return {
    ...presentOrder(order),
    listPriceLabel: formatMoney(order.listPrice),
    discountLabel: formatMoney(order.discount),
    couponDiscountLabel: formatMoney(order.couponDiscount),
    payment: order.payment ? presentPayment(order.payment) : null,
    refunds: order.refunds.map((r) => ({
      id: r.id,
      status: r.status,
      statusLabel: statusLabel(r.status),
      amountLabel: formatMoney(r.amount),
      reason: r.reason,
      createdLabel: kstCompactDateTime(r.createdAt),
    })),
    refundRequest: order.refundRequest
      ? presentRefundRequest(order.refundRequest, order)
      : null,
    canRequestRefund: order.canRequestRefund,
    enrollmentId: order.enrollment?.id ?? null,
    history: admin
      ? order.history.map((h) => ({
          id: h.id,
          action: historyLabels[h.action] ?? "처리 상태 변경",
          createdLabel: kstCompactDateTime(h.createdAt),
        }))
      : [],
  };
}
export function presentCoupon(
  row: Awaited<ReturnType<typeof couponRepository.findAll>>["items"][number],
): CouponView {
  const now = new Date();
  const status: CouponView["status"] = !row.active
    ? "inactive"
    : row.endsAt && row.endsAt <= now
      ? "expired"
      : row.usageLimit !== null && row.usedCount >= row.usageLimit
        ? "exhausted"
        : "active";
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    type: row.type,
    typeLabel: statusLabel(row.type),
    value: row.value,
    valueLabel: row.type === "percent" ? `${row.value}%` : formatMoney(row.value),
    minAmount: row.minAmount,
    minAmountLabel: formatMoney(row.minAmount),
    maxDiscount: row.maxDiscount,
    courseId: row.courseId,
    courseTitle: row.courseTitle,
    startsLabel: dateLabel(row.startsAt),
    endsLabel: dateLabel(row.endsAt),
    startsAt: row.startsAt?.toISOString() ?? null,
    endsAt: row.endsAt?.toISOString() ?? null,
    usageLimit: row.usageLimit,
    usedCount: row.usedCount,
    usageLabel: row.usageLimit === null ? `${row.usedCount}회` : `${row.usedCount}/${row.usageLimit}회`,
    perUserLimit: row.perUserLimit,
    active: row.active,
    status,
    statusLabel: status === "active" ? "사용 가능" : statusLabel(status),
    createdLabel: kstCompactDateTime(row.createdAt),
  };
}
export function presentReview(
  row: Awaited<ReturnType<typeof communityRepository.findReviews>>["items"][number],
): ReviewView {
  return {
    id: row.review.id,
    courseId: row.review.courseId,
    courseTitle: row.courseTitle,
    userId: row.review.userId,
    userName: row.userName ?? "수강생",
    rating: row.review.rating,
    content: row.review.content,
    status: row.review.status,
    statusLabel: statusLabel(row.review.status),
    adminReply: row.review.adminReply,
    adminRepliedLabel: dateLabel(row.review.adminRepliedAt),
    createdLabel: kstCompactDateTime(row.review.createdAt),
  };
}
export function presentComment(
  row: typeof questionComments.$inferSelect,
): CommentView {
  return {
    id: row.id,
    questionId: row.questionId,
    authorType: row.authorType,
    authorName: row.authorName,
    content: row.content,
    isAnswer: row.isAnswer,
    createdLabel: kstCompactDateTime(row.createdAt),
  };
}
export function presentQuestion(
  row: Awaited<ReturnType<typeof communityRepository.findQuestions>>["items"][number] & {
    comments?: (typeof questionComments.$inferSelect)[];
  },
): QuestionView {
  return {
    id: row.question.id,
    courseId: row.question.courseId,
    courseTitle: row.courseTitle,
    lessonId: row.question.lessonId,
    lessonTitle: row.lessonTitle,
    userId: row.question.userId,
    userName: row.userName ?? "수강생",
    title: row.question.title,
    content: row.question.content,
    status: row.question.status,
    statusLabel: statusLabel(row.question.status),
    pinned: row.question.pinned,
    commentCount: row.question.commentCount,
    createdLabel: kstCompactDateTime(row.question.createdAt),
    comments: (row.comments ?? []).map(presentComment),
  };
}
export function presentNotice(row: typeof notices.$inferSelect): NoticeView {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    pinned: row.pinned,
    status: row.status,
    statusLabel: statusLabel(row.status),
    publishedLabel: dateLabel(row.publishedAt),
    createdLabel: kstCompactDateTime(row.createdAt),
  };
}
export function presentBanner(row: typeof banners.$inferSelect): BannerView {
  return {
    id: row.id,
    title: row.title,
    image: JSON.parse(row.image) as ImageAsset,
    linkUrl: row.linkUrl,
    position: row.position,
    active: row.active,
    startsLabel: dateLabel(row.startsAt),
    endsLabel: dateLabel(row.endsAt),
    startsAt: row.startsAt?.toISOString() ?? null,
    endsAt: row.endsAt?.toISOString() ?? null,
  };
}
export function presentStudent(
  row: Awaited<ReturnType<typeof operationsRepository.findStudents>>["items"][number],
): StudentView {
  return {
    id: row.id,
    name: row.name ?? "",
    email: row.email,
    emailVerified: row.emailVerified,
    enrollmentCount: row.enrollmentCount,
    completedCount: row.completedCount,
    createdLabel: kstCompactDateTime(row.createdAt),
  };
}
export function presentProgressDetail(
  row: Awaited<ReturnType<typeof enrollmentRepository.findProgress>>[number],
): ProgressDetailView {
  return {
    lessonId: row.lessonId,
    lessonTitle: row.lessonTitle,
    positionSeconds: row.positionSeconds,
    completed: row.completed,
    updatedLabel: kstCompactDateTime(row.updatedAt),
  };
}
export function presentDashboard(
  data: Awaited<ReturnType<typeof operationsRepository.dashboard>>,
): DashboardView {
  return {
    courses: data.courses,
    students: data.students,
    enrollments: data.enrollments,
    activeEnrollments: data.activeEnrollments,
    grossLabel: formatMoney(data.gross),
    netLabel: formatMoney(data.gross - data.refunded),
    refundedLabel: formatMoney(data.refunded),
    needsReview: data.needsReview,
    pendingRefunds: data.pendingRefunds,
    openQuestions: data.openQuestions,
    completionRate: data.completionRate,
    recent: data.recent.map(presentOrder),
    monthly: data.monthly.map((m) => ({ ...m, salesLabel: formatMoney(m.sales) })),
    topCourses: data.topCourses,
  };
}
export function presentSettings(
  data: ReturnType<typeof operationsRepository.settings>,
): SettingsView {
  return {
    name: data.name,
    mode: data.mode,
    orderExpiryMinutes: data.orderExpiryMinutes,
    refundWindowDays: data.refundWindowDays,
    refundProgressLimit: data.refundProgressLimit,
    paymentReady: data.paymentReady,
    databaseReady: data.databaseReady,
    storageReady: data.storageReady,
    appUrl: data.appUrl,
  };
}
export function presentQuote(
  data: Awaited<ReturnType<typeof orderRepository.quote>>,
): QuoteView {
  return {
    courseId: data.course.id,
    courseTitle: data.course.title,
    listPrice: data.listPrice,
    listPriceLabel: formatMoney(data.listPrice),
    discount: data.discount,
    couponCode: data.couponCode,
    couponDiscount: data.couponDiscount,
    couponDiscountLabel: formatMoney(data.couponDiscount),
    couponError: data.couponError,
    total: data.total,
    totalLabel: formatMoney(data.total),
    isFree: data.total === 0,
    alreadyEnrolled: data.alreadyEnrolled,
  };
}
