import type { ImageAsset } from "@/lib/image";

export type CategoryView = { id: string; name: string; slug: string };
export type InstructorView = {
  id: string;
  name: string;
  title: string;
  bio: string;
  image: ImageAsset | null;
  courseCount?: number;
};
export type VideoView = {
  provider: "youtube" | "url";
  url: string;
  /** youtube 일 때 IFrame API 에 넘길 영상 ID */
  embedId: string | null;
};
export type LessonView = {
  id: string;
  sectionId: string;
  title: string;
  position: number;
  /** 미리보기이거나 수강 중일 때만 채워진다. 공개 상세에선 null. */
  video: VideoView | null;
  hasVideo: boolean;
  durationSeconds: number;
  durationLabel: string;
  isPreview: boolean;
  /** 레슨 자료(HTML). 플레이어·관리자에서만 채운다. */
  content: string;
};
export type SectionView = {
  id: string;
  title: string;
  position: number;
  durationSeconds: number;
  durationLabel: string;
  lessons: LessonView[];
};
export type CourseSummary = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  thumbnail: ImageAsset | null;
  categoryId: string | null;
  categoryName: string | null;
  instructorId: string | null;
  instructorName: string | null;
  level: "beginner" | "intermediate" | "advanced";
  levelLabel: string;
  status: "draft" | "published" | "archived";
  statusLabel: string;
  price: number;
  discountPrice: number | null;
  /** 지금 결제될 금액(할인 반영) */
  salePrice: number;
  priceLabel: string;
  /** 할인 중일 때 정가 표시, 아니면 null */
  originalPriceLabel: string | null;
  discountRate: number;
  discountEndsLabel: string | null;
  /** 할인 종료 시각(ISO). 할인가가 없으면 null. 편집 폼용 원값. */
  discountEndsAt: string | null;
  isFree: boolean;
  lessonCount: number;
  totalDurationSeconds: number;
  totalDurationLabel: string;
  enrollmentCount: number;
  rating: number | null;
  ratingLabel: string;
  reviewCount: number;
  createdLabel: string;
  publishedLabel: string | null;
};
export type CourseView = CourseSummary & {
  description: string;
  instructor: InstructorView | null;
  sections: SectionView[];
  /** 로그인 사용자가 수강 중이면 채워진다 */
  enrollment: { id: string; progressPercent: number; lastLessonId: string | null } | null;
};
export type EnrollmentView = {
  id: string;
  courseId: string;
  courseTitle: string;
  courseSlug: string;
  thumbnail: ImageAsset | null;
  userId: string;
  userEmail: string;
  userName: string;
  orderId: string | null;
  source: "order" | "free" | "manual";
  sourceLabel: string;
  status: "active" | "revoked" | "expired";
  statusLabel: string;
  progressPercent: number;
  completedLessons: number;
  lessonCount: number;
  lastLessonId: string | null;
  startedLabel: string;
  completedLabel: string | null;
  expiresLabel: string | null;
  certificateId: string | null;
};
export type LessonProgressView = {
  lessonId: string;
  positionSeconds: number;
  completed: boolean;
};
/** 강의실(플레이어) 한 화면에 필요한 전부 */
export type PlayerView = {
  enrollmentId: string;
  course: { id: string; title: string; slug: string };
  sections: SectionView[];
  progress: LessonProgressView[];
  progressPercent: number;
  completedLessons: number;
  lessonCount: number;
  lastLessonId: string | null;
  certificateId: string | null;
};
export type CertificateView = {
  id: string;
  number: string;
  enrollmentId: string;
  courseId: string;
  courseTitle: string;
  instructorName: string | null;
  userName: string;
  userEmail: string;
  totalDurationLabel: string;
  issuedLabel: string;
  issuedAt: string;
};
export type OrderSummary = {
  id: string;
  number: string;
  displayNumber: string;
  customerId: string;
  customerEmail: string;
  /** 결제 대상 — 강의 또는 디지털 상품 */
  itemType: "course" | "product";
  itemTypeLabel: string;
  itemId: string;
  itemTitle: string;
  courseId: string | null;
  productId: string | null;
  status: "pending" | "confirmed" | "cancelled" | "expired" | "refunded";
  statusLabel: string;
  paymentStatus: string;
  paymentLabel: string;
  listPrice: number;
  discount: number;
  couponDiscount: number;
  couponCode: string | null;
  total: number;
  totalLabel: string;
  createdLabel: string;
  expiresLabel: string;
};
export type PaymentView = {
  id: string;
  orderId: string;
  providerOrderId: string;
  displayOrderNumber: string;
  status: string;
  statusLabel: string;
  amount: number;
  amountLabel: string;
  refundedAmount: number;
  refundedLabel: string;
  refundableAmount: number;
  mode: "test" | "live";
  method: string;
  receiptUrl: string | null;
  lastError: string | null;
  pendingRefundId: string | null;
  createdLabel: string;
};
export type RefundRequestView = {
  id: string;
  orderId: string;
  displayNumber: string;
  customerEmail: string;
  itemTitle: string;
  amount: number;
  amountLabel: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  statusLabel: string;
  note: string;
  createdLabel: string;
  decidedLabel: string | null;
};
export type OrderView = OrderSummary & {
  listPriceLabel: string;
  discountLabel: string;
  couponDiscountLabel: string;
  payment: PaymentView | null;
  refunds: {
    id: string;
    status: string;
    statusLabel: string;
    amountLabel: string;
    reason: string;
    createdLabel: string;
  }[];
  refundRequest: RefundRequestView | null;
  /** 수강생이 환불을 신청할 수 있는 상태인지 */
  canRequestRefund: boolean;
  enrollmentId: string | null;
  purchaseId: string | null;
  history: { id: string; action: string; createdLabel: string }[];
};
export type CouponView = {
  id: string;
  code: string;
  name: string;
  type: "percent" | "fixed";
  typeLabel: string;
  value: number;
  valueLabel: string;
  minAmount: number;
  minAmountLabel: string;
  maxDiscount: number | null;
  courseId: string | null;
  courseTitle: string | null;
  productId: string | null;
  productTitle: string | null;
  startsLabel: string | null;
  endsLabel: string | null;
  startsAt: string | null;
  endsAt: string | null;
  usageLimit: number | null;
  usedCount: number;
  usageLabel: string;
  perUserLimit: number;
  active: boolean;
  status: "active" | "inactive" | "expired" | "exhausted";
  statusLabel: string;
  createdLabel: string;
};
/** 결제 전 금액 미리보기 */
export type QuoteView = {
  itemType: "course" | "product";
  itemId: string;
  itemTitle: string;
  /** 무료 신청: 결제 없이 연락처(contact)를 받아 바로 개설한다 */
  requiresContact: boolean;
  listPrice: number;
  listPriceLabel: string;
  discount: number;
  couponCode: string | null;
  couponDiscount: number;
  couponDiscountLabel: string;
  couponError: string | null;
  total: number;
  totalLabel: string;
  isFree: boolean;
  alreadyEnrolled: boolean;
};
export type CheckoutView = {
  id: string;
  orderId: string;
  orderName: string;
  amount: number;
  /** 무료 강의: 주문이 이미 확정됐고 수강이 등록됐다. 결제창을 열지 않는다. */
  free: boolean;
  itemType: "course" | "product";
  itemId: string;
  /** 무료·결제 완료 후 이동할 곳: 강의는 /learn/[id], 상품은 /account/products */
  continueUrl: string;
  clientKey: string;
  customerKey: string;
  customerEmail: string;
  successUrl: string;
  failUrl: string;
  mode: "test" | "live";
};
export type ReviewView = {
  id: string;
  courseId: string;
  courseTitle: string;
  userId: string;
  userName: string;
  rating: number;
  content: string;
  status: "visible" | "hidden";
  statusLabel: string;
  adminReply: string | null;
  adminRepliedLabel: string | null;
  createdLabel: string;
};
export type CommentView = {
  id: string;
  questionId: string;
  authorType: "user" | "admin";
  authorName: string;
  content: string;
  isAnswer: boolean;
  createdLabel: string;
};
export type QuestionView = {
  id: string;
  courseId: string;
  courseTitle: string;
  lessonId: string | null;
  lessonTitle: string | null;
  userId: string;
  userName: string;
  title: string;
  content: string;
  status: "open" | "answered" | "closed";
  statusLabel: string;
  pinned: boolean;
  commentCount: number;
  createdLabel: string;
  comments: CommentView[];
};
export type NoticeView = {
  id: string;
  title: string;
  content: string;
  pinned: boolean;
  status: "draft" | "published";
  statusLabel: string;
  publishedLabel: string | null;
  createdLabel: string;
};
export type BannerView = {
  id: string;
  title: string;
  image: ImageAsset;
  linkUrl: string;
  position: number;
  active: boolean;
  startsLabel: string | null;
  endsLabel: string | null;
  startsAt: string | null;
  endsAt: string | null;
};
export type StudentView = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  enrollmentCount: number;
  completedCount: number;
  createdLabel: string;
};
export type DashboardView = {
  courses: number;
  students: number;
  enrollments: number;
  activeEnrollments: number;
  grossLabel: string;
  netLabel: string;
  refundedLabel: string;
  needsReview: number;
  pendingRefunds: number;
  openQuestions: number;
  completionRate: number;
  recent: OrderSummary[];
  monthly: { month: string; sales: number; salesLabel: string; enrollments: number }[];
  topCourses: { id: string; title: string; enrollments: number; completionRate: number }[];
};
export type SettingsView = {
  name: string;
  mode: "test" | "live";
  orderExpiryMinutes: number;
  refundWindowDays: number;
  refundProgressLimit: number;
  paymentReady: boolean;
  databaseReady: boolean;
  storageReady: boolean;
  appUrl: string | null;
};
export type UploadTicket = {
  id: string;
  key: string;
  url: string;
  method: "GET" | "HEAD" | "PUT" | "DELETE";
  headers: Record<string, string>;
  expiresAt: string;
  publicUrl: string | null;
};
export type UploadFolder = "courses" | "products" | "instructors" | "banners" | "content";
export type PaymentRowView = PaymentView & {
  customerEmail: string;
  itemTitle: string;
};
export type ProgressDetailView = LessonProgressView & {
  lessonTitle: string;
  updatedLabel: string;
};
/** saveProgress 응답 — 플레이어가 진도율·수료증 발급을 즉시 반영한다 */
export type ProgressResult = {
  positionSeconds: number;
  completed: boolean;
  progressPercent: number;
  completedLessons: number;
  certificateId: string | null;
};

// ── 디지털 상품 ──────────────────────────────────────────────────
export type ProductFileView = {
  id: string;
  name: string;
  contentType: string;
  size: number;
  sizeLabel: string;
  position: number;
  status: "pending" | "ready" | "deleted";
};
export type ProductSummary = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  thumbnail: ImageAsset | null;
  categoryId: string | null;
  categoryName: string | null;
  kind: "file" | "bundle";
  kindLabel: string;
  status: "draft" | "published" | "archived";
  statusLabel: string;
  price: number;
  discountPrice: number | null;
  salePrice: number;
  priceLabel: string;
  originalPriceLabel: string | null;
  discountRate: number;
  discountEndsLabel: string | null;
  discountEndsAt: string | null;
  isFree: boolean;
  downloadLimit: number | null;
  fileCount: number;
  courseCount: number;
  purchaseCount: number;
  createdLabel: string;
  publishedLabel: string | null;
};
export type ProductView = ProductSummary & {
  description: string;
  files: ProductFileView[];
  /** 묶음에 포함된 강의 */
  courses: { id: string; title: string; slug: string; thumbnail: ImageAsset | null; lessonCount: number }[];
  /** 로그인 사용자가 이미 구매했으면 채워진다 */
  purchase: { id: string; downloadCount: number } | null;
};
export type PurchaseView = {
  id: string;
  productId: string;
  productTitle: string;
  productSlug: string;
  thumbnail: ImageAsset | null;
  kind: "file" | "bundle";
  kindLabel: string;
  userId: string;
  userEmail: string;
  userName: string;
  orderId: string | null;
  source: "order" | "free" | "manual";
  sourceLabel: string;
  status: "active" | "revoked";
  statusLabel: string;
  downloadCount: number;
  downloadLimit: number | null;
  downloadsLabel: string;
  files: ProductFileView[];
  /** 묶음 강의 → /learn 링크용 */
  courses: { id: string; title: string }[];
  purchasedLabel: string;
  lastDownloadedLabel: string | null;
};
/** 짧게 사는 다운로드 주소 */
export type DownloadLinkView = {
  url: string;
  method: "GET" | "HEAD" | "PUT" | "DELETE";
  headers: Record<string, string>;
  expiresAt: string;
  fileName: string;
  remaining: number | null;
};
export type LeadView = {
  id: string;
  userId: string | null;
  name: string;
  email: string;
  phone: string;
  source: "free_course" | "free_product";
  sourceLabel: string;
  itemTitle: string;
  courseId: string | null;
  productId: string | null;
  consent: boolean;
  note: string;
  createdLabel: string;
};
export type FileUploadTicket = Omit<UploadTicket, "id"> & { fileId: string };
