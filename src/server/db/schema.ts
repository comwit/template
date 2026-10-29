import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { appAuthUser } from "./plugin/auth/app-schema";
export * from "./plugin/auth/app-schema";
export * from "./plugin/auth/admin-schema";

const timestamps = () => ({
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
});
const id = () => text("id").primaryKey();

// ── 강의 카탈로그 ────────────────────────────────────────────────
export const categories = sqliteTable(
  "categories",
  {
    id: id(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("categories_slug_uq").on(t.slug),
    index("categories_list_idx").on(t.deletedAt, t.name),
  ],
);

/** 표시용 강사 프로필. 단일 운영자 모델이라 계정·정산이 없다. */
export const instructors = sqliteTable(
  "instructors",
  {
    id: id(),
    name: text("name").notNull(),
    title: text("title").notNull().default(""),
    bio: text("bio").notNull().default(""),
    image: text("image"),
    ...timestamps(),
  },
  (t) => [index("instructors_list_idx").on(t.deletedAt, t.name)],
);

export const courses = sqliteTable(
  "courses",
  {
    id: id(),
    categoryId: text("category_id").references(() => categories.id),
    instructorId: text("instructor_id").references(() => instructors.id),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    summary: text("summary").notNull().default(""),
    /** TipTap HTML */
    description: text("description").notNull().default(""),
    thumbnail: text("thumbnail"),
    level: text("level", { enum: ["beginner", "intermediate", "advanced"] })
      .notNull()
      .default("beginner"),
    price: integer("price").notNull().default(0),
    discountPrice: integer("discount_price"),
    discountEndsAt: integer("discount_ends_at", { mode: "timestamp_ms" }),
    status: text("status", { enum: ["draft", "published", "archived"] })
      .notNull()
      .default("draft"),
    lessonCount: integer("lesson_count").notNull().default(0),
    totalDurationSeconds: integer("total_duration_seconds")
      .notNull()
      .default(0),
    enrollmentCount: integer("enrollment_count").notNull().default(0),
    ratingSum: integer("rating_sum").notNull().default(0),
    reviewCount: integer("review_count").notNull().default(0),
    publishedAt: integer("published_at", { mode: "timestamp_ms" }),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("courses_slug_uq").on(t.slug),
    index("courses_list_idx").on(t.deletedAt, t.status, t.publishedAt),
    index("courses_category_idx").on(t.categoryId, t.deletedAt),
    index("courses_title_idx").on(t.title),
    check("courses_price_check", sql`${t.price} >= 0`),
    check(
      "courses_discount_check",
      sql`${t.discountPrice} IS NULL OR (${t.discountPrice} >= 0 AND ${t.discountPrice} < ${t.price})`,
    ),
  ],
);

export const sections = sqliteTable(
  "sections",
  {
    id: id(),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id),
    title: text("title").notNull(),
    position: integer("position").notNull().default(0),
    ...timestamps(),
  },
  (t) => [index("sections_course_idx").on(t.courseId, t.deletedAt, t.position)],
);

export const lessons = sqliteTable(
  "lessons",
  {
    id: id(),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id),
    sectionId: text("section_id")
      .notNull()
      .references(() => sections.id),
    title: text("title").notNull(),
    position: integer("position").notNull().default(0),
    /** JSON `{ provider: "youtube" | "url", url }` 또는 null(영상 없음·자료만) */
    video: text("video"),
    durationSeconds: integer("duration_seconds").notNull().default(0),
    isPreview: integer("is_preview", { mode: "boolean" })
      .notNull()
      .default(false),
    /** TipTap HTML — 레슨 자료·설명 */
    content: text("content").notNull().default(""),
    ...timestamps(),
  },
  (t) => [
    index("lessons_course_idx").on(t.courseId, t.deletedAt, t.position),
    index("lessons_section_idx").on(t.sectionId, t.deletedAt, t.position),
    check("lessons_duration_check", sql`${t.durationSeconds} >= 0`),
  ],
);

// ── 수강 ─────────────────────────────────────────────────────────
export const enrollments = sqliteTable(
  "enrollments",
  {
    id: id(),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id),
    userId: text("user_id")
      .notNull()
      .references(() => appAuthUser.id),
    orderId: text("order_id"),
    source: text("source", { enum: ["order", "free", "manual"] }).notNull(),
    status: text("status", { enum: ["active", "revoked", "expired"] })
      .notNull()
      .default("active"),
    progressPercent: integer("progress_percent").notNull().default(0),
    completedLessons: integer("completed_lessons").notNull().default(0),
    lastLessonId: text("last_lesson_id"),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }),
    completedAt: integer("completed_at", { mode: "timestamp_ms" }),
    grantedBy: text("granted_by"),
    revokeReason: text("revoke_reason"),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("enrollments_course_user_uq").on(t.courseId, t.userId),
    index("enrollments_user_idx").on(t.userId, t.status, t.updatedAt),
    index("enrollments_course_idx").on(t.courseId, t.status, t.createdAt),
    index("enrollments_order_idx").on(t.orderId),
    check(
      "enrollments_progress_check",
      sql`${t.progressPercent} BETWEEN 0 AND 100 AND ${t.completedLessons} >= 0`,
    ),
  ],
);

export const lessonProgress = sqliteTable(
  "lesson_progress",
  {
    id: id(),
    enrollmentId: text("enrollment_id")
      .notNull()
      .references(() => enrollments.id),
    lessonId: text("lesson_id")
      .notNull()
      .references(() => lessons.id),
    positionSeconds: integer("position_seconds").notNull().default(0),
    completed: integer("completed", { mode: "boolean" })
      .notNull()
      .default(false),
    completedAt: integer("completed_at", { mode: "timestamp_ms" }),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("lesson_progress_uq").on(t.enrollmentId, t.lessonId),
    index("lesson_progress_lesson_idx").on(t.lessonId),
    check("lesson_progress_position_check", sql`${t.positionSeconds} >= 0`),
  ],
);

export const certificates = sqliteTable(
  "certificates",
  {
    id: id(),
    number: text("number").notNull(),
    enrollmentId: text("enrollment_id")
      .notNull()
      .references(() => enrollments.id),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id),
    userId: text("user_id")
      .notNull()
      .references(() => appAuthUser.id),
    issuedAt: integer("issued_at", { mode: "timestamp_ms" }).notNull(),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("certificates_number_uq").on(t.number),
    uniqueIndex("certificates_enrollment_uq").on(t.enrollmentId),
    index("certificates_user_idx").on(t.userId, t.issuedAt),
  ],
);

// ── 쿠폰 ─────────────────────────────────────────────────────────
export const coupons = sqliteTable(
  "coupons",
  {
    id: id(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    type: text("type", { enum: ["percent", "fixed"] }).notNull(),
    value: integer("value").notNull(),
    minAmount: integer("min_amount").notNull().default(0),
    maxDiscount: integer("max_discount"),
    /** null 이면 모든 강의에 적용 */
    courseId: text("course_id").references(() => courses.id),
    startsAt: integer("starts_at", { mode: "timestamp_ms" }),
    endsAt: integer("ends_at", { mode: "timestamp_ms" }),
    usageLimit: integer("usage_limit"),
    usedCount: integer("used_count").notNull().default(0),
    perUserLimit: integer("per_user_limit").notNull().default(1),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("coupons_code_uq").on(t.code),
    index("coupons_list_idx").on(t.deletedAt, t.active, t.createdAt),
    check("coupons_value_check", sql`${t.value} > 0`),
    check(
      "coupons_usage_check",
      sql`${t.usedCount} >= 0 AND (${t.usageLimit} IS NULL OR ${t.usedCount} <= ${t.usageLimit})`,
    ),
  ],
);

export const couponRedemptions = sqliteTable(
  "coupon_redemptions",
  {
    id: id(),
    couponId: text("coupon_id")
      .notNull()
      .references(() => coupons.id),
    userId: text("user_id")
      .notNull()
      .references(() => appAuthUser.id),
    orderId: text("order_id").notNull(),
    status: text("status", { enum: ["held", "used", "released"] })
      .notNull()
      .default("held"),
    discount: integer("discount").notNull(),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("coupon_redemptions_order_uq").on(t.orderId),
    index("coupon_redemptions_user_idx").on(t.couponId, t.userId, t.status),
  ],
);

// ── 주문·결제·환불 ──────────────────────────────────────────────
/** 주문 1건 = 강의 1개. 장바구니 없이 강의 상세에서 바로 결제한다. */
export const orders = sqliteTable(
  "orders",
  {
    id: id(),
    number: text("number").notNull(),
    customerId: text("customer_id")
      .notNull()
      .references(() => appAuthUser.id),
    customerEmail: text("customer_email").notNull(),
    requestKey: text("request_key").notNull(),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id),
    courseTitle: text("course_title").notNull(),
    status: text("status", {
      enum: ["pending", "confirmed", "cancelled", "expired", "refunded"],
    })
      .notNull()
      .default("pending"),
    paymentStatus: text("payment_status", {
      enum: ["free", "unpaid", "processing", "paid", "refunded", "failed", "review"],
    })
      .notNull()
      .default("unpaid"),
    listPrice: integer("list_price").notNull(),
    discount: integer("discount").notNull().default(0),
    couponId: text("coupon_id"),
    couponCode: text("coupon_code"),
    couponDiscount: integer("coupon_discount").notNull().default(0),
    total: integer("total").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("orders_number_uq").on(t.number),
    uniqueIndex("orders_request_uq").on(t.customerId, t.requestKey),
    index("orders_customer_idx").on(t.customerId, t.deletedAt, t.createdAt),
    index("orders_status_idx").on(t.deletedAt, t.status, t.createdAt),
    index("orders_course_idx").on(t.courseId, t.status),
    index("orders_expiry_idx").on(t.status, t.expiresAt),
    check(
      "orders_amount_check",
      sql`${t.listPrice} >= 0 AND ${t.discount} >= 0 AND ${t.couponDiscount} >= 0 AND ${t.total} >= 0 AND ${t.total} = ${t.listPrice} - ${t.discount} - ${t.couponDiscount}`,
    ),
  ],
);

export const payments = sqliteTable(
  "payments",
  {
    id: id(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id),
    providerOrderId: text("provider_order_id").notNull(),
    paymentKey: text("payment_key"),
    status: text("status", {
      enum: ["ready", "confirming", "done", "cancelled", "failed", "unknown"],
    })
      .notNull()
      .default("ready"),
    amount: integer("amount").notNull(),
    refundedAmount: integer("refunded_amount").notNull().default(0),
    idempotencyKey: text("idempotency_key").notNull(),
    pendingRefundId: text("pending_refund_id"),
    mode: text("mode", { enum: ["test", "live"] }).notNull(),
    method: text("method"),
    receiptUrl: text("receipt_url"),
    lastError: text("last_error"),
    approvedAt: integer("approved_at", { mode: "timestamp_ms" }),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("payments_order_uq").on(t.orderId),
    uniqueIndex("payments_provider_order_uq").on(t.providerOrderId),
    uniqueIndex("payments_key_uq").on(t.paymentKey),
    uniqueIndex("payments_idempotency_uq").on(t.idempotencyKey),
    index("payments_status_idx").on(t.status, t.updatedAt),
    index("payments_date_idx").on(t.createdAt),
    check(
      "payments_amount_check",
      sql`${t.amount} > 0 AND ${t.refundedAmount} BETWEEN 0 AND ${t.amount}`,
    ),
  ],
);

/** 환불은 강의 1건 전액만 처리한다. */
export const refunds = sqliteTable(
  "refunds",
  {
    id: id(),
    paymentId: text("payment_id")
      .notNull()
      .references(() => payments.id),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id),
    requestKey: text("request_key").notNull(),
    status: text("status", {
      enum: ["pending", "succeeded", "failed", "unknown"],
    })
      .notNull()
      .default("pending"),
    amount: integer("amount").notNull(),
    reason: text("reason").notNull(),
    actorId: text("actor_id").notNull(),
    providerTransactionKey: text("provider_transaction_key"),
    lastError: text("last_error"),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("refunds_request_uq").on(t.requestKey),
    uniqueIndex("refunds_transaction_uq").on(t.providerTransactionKey),
    index("refunds_payment_idx").on(t.paymentId, t.status),
    index("refunds_order_idx").on(t.orderId, t.createdAt),
    index("refunds_status_idx").on(t.status, t.updatedAt),
    check("refunds_amount_check", sql`${t.amount} > 0`),
  ],
);

/** 수강생이 마이페이지에서 넣는 환불 신청. 운영자가 승인하면 refunds 로 이어진다. */
export const refundRequests = sqliteTable(
  "refund_requests",
  {
    id: id(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id),
    userId: text("user_id")
      .notNull()
      .references(() => appAuthUser.id),
    reason: text("reason").notNull(),
    status: text("status", { enum: ["pending", "approved", "rejected"] })
      .notNull()
      .default("pending"),
    note: text("note").notNull().default(""),
    decidedBy: text("decided_by"),
    decidedAt: integer("decided_at", { mode: "timestamp_ms" }),
    ...timestamps(),
  },
  (t) => [
    index("refund_requests_order_idx").on(t.orderId, t.status),
    index("refund_requests_list_idx").on(t.status, t.createdAt),
  ],
);

export const webhookEvents = sqliteTable(
  "webhook_events",
  {
    id: id(),
    eventKey: text("event_key").notNull(),
    paymentKey: text("payment_key").notNull(),
    status: text("status", { enum: ["pending", "processed", "failed"] })
      .notNull()
      .default("pending"),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("webhooks_key_uq").on(t.eventKey),
    index("webhooks_retry_idx").on(t.status, t.updatedAt),
    index("webhooks_payment_idx").on(t.paymentKey),
  ],
);

// ── 수강평·Q&A ───────────────────────────────────────────────────
export const reviews = sqliteTable(
  "reviews",
  {
    id: id(),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id),
    userId: text("user_id")
      .notNull()
      .references(() => appAuthUser.id),
    enrollmentId: text("enrollment_id")
      .notNull()
      .references(() => enrollments.id),
    rating: integer("rating").notNull(),
    content: text("content").notNull(),
    status: text("status", { enum: ["visible", "hidden"] })
      .notNull()
      .default("visible"),
    adminReply: text("admin_reply"),
    adminRepliedAt: integer("admin_replied_at", { mode: "timestamp_ms" }),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("reviews_course_user_uq").on(t.courseId, t.userId),
    index("reviews_course_idx").on(t.courseId, t.status, t.createdAt),
    index("reviews_list_idx").on(t.deletedAt, t.status, t.createdAt),
    check("reviews_rating_check", sql`${t.rating} BETWEEN 1 AND 5`),
  ],
);

export const questions = sqliteTable(
  "questions",
  {
    id: id(),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id),
    lessonId: text("lesson_id").references(() => lessons.id),
    userId: text("user_id")
      .notNull()
      .references(() => appAuthUser.id),
    title: text("title").notNull(),
    /** TipTap HTML */
    content: text("content").notNull(),
    status: text("status", { enum: ["open", "answered", "closed"] })
      .notNull()
      .default("open"),
    pinned: integer("pinned", { mode: "boolean" }).notNull().default(false),
    commentCount: integer("comment_count").notNull().default(0),
    answeredAt: integer("answered_at", { mode: "timestamp_ms" }),
    ...timestamps(),
  },
  (t) => [
    index("questions_course_idx").on(t.courseId, t.deletedAt, t.createdAt),
    index("questions_lesson_idx").on(t.lessonId, t.deletedAt, t.createdAt),
    index("questions_list_idx").on(t.deletedAt, t.status, t.createdAt),
    index("questions_user_idx").on(t.userId, t.createdAt),
  ],
);

export const questionComments = sqliteTable(
  "question_comments",
  {
    id: id(),
    questionId: text("question_id")
      .notNull()
      .references(() => questions.id),
    authorType: text("author_type", { enum: ["user", "admin"] }).notNull(),
    authorId: text("author_id").notNull(),
    authorName: text("author_name").notNull(),
    /** TipTap HTML */
    content: text("content").notNull(),
    isAnswer: integer("is_answer", { mode: "boolean" })
      .notNull()
      .default(false),
    ...timestamps(),
  },
  (t) => [
    index("question_comments_question_idx").on(
      t.questionId,
      t.deletedAt,
      t.createdAt,
    ),
  ],
);

// ── 공지·배너 ────────────────────────────────────────────────────
export const notices = sqliteTable(
  "notices",
  {
    id: id(),
    title: text("title").notNull(),
    /** TipTap HTML */
    content: text("content").notNull().default(""),
    pinned: integer("pinned", { mode: "boolean" }).notNull().default(false),
    status: text("status", { enum: ["draft", "published"] })
      .notNull()
      .default("draft"),
    publishedAt: integer("published_at", { mode: "timestamp_ms" }),
    ...timestamps(),
  },
  (t) => [index("notices_list_idx").on(t.deletedAt, t.status, t.pinned, t.publishedAt)],
);

export const banners = sqliteTable(
  "banners",
  {
    id: id(),
    title: text("title").notNull(),
    image: text("image").notNull(),
    linkUrl: text("link_url").notNull().default(""),
    position: integer("position").notNull().default(0),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    startsAt: integer("starts_at", { mode: "timestamp_ms" }),
    endsAt: integer("ends_at", { mode: "timestamp_ms" }),
    ...timestamps(),
  },
  (t) => [index("banners_list_idx").on(t.deletedAt, t.active, t.position)],
);

// ── 운영 공통 ────────────────────────────────────────────────────
export const auditLogs = sqliteTable(
  "audit_logs",
  {
    id: id(),
    actorId: text("actor_id").notNull(),
    action: text("action").notNull(),
    entityId: text("entity_id").notNull(),
    detail: text("detail").notNull(),
    ...timestamps(),
  },
  (t) => [
    index("audit_entity_idx").on(t.entityId, t.createdAt),
    index("audit_actor_idx").on(t.actorId, t.createdAt),
  ],
);

export const mediaAssets = sqliteTable(
  "media_assets",
  {
    id: id(),
    ownerId: text("owner_id").notNull(),
    storageKey: text("storage_key").notNull(),
    image: text("image"),
    status: text("status", { enum: ["pending", "ready", "deleted"] })
      .notNull()
      .default("pending"),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("media_storage_key_uq").on(t.storageKey),
    index("media_owner_idx").on(t.ownerId, t.status, t.createdAt),
  ],
);

/** Global commerce revision: optimistic commits fail atomically when reads became stale. */
export const commerceRevision = sqliteTable(
  "commerce_revision",
  {
    id: text("id").primaryKey(),
    revision: integer("revision").notNull(),
  },
  (t) => [check("commerce_revision_valid", sql`${t.revision} >= 0`)],
);
