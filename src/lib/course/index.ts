import { z } from "zod";

export const entityId = z.string().uuid();
export const requestKey = z
  .string()
  .min(8)
  .max(100)
  .regex(/^[a-zA-Z0-9_-]+$/);
export const money = z.number().int().min(0).max(1_000_000_000);
export const html = z.string().max(200_000).default("");
export const pageSchema = z.object({
  page: z.number().int().min(1).max(100_000).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});
export const imageSchema = z.object({
  url: z.string().url(),
  width: z.number().int().positive().max(10000),
  height: z.number().int().positive().max(10000),
  thumb: z.string().url().optional(),
});
const slug = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
/** ISO 문자열 또는 null. 폼은 datetime-local 값을 그대로 넘긴다. */
const dateInput = z
  .string()
  .trim()
  .refine((v) => !Number.isNaN(Date.parse(v)), "날짜 형식을 확인해주세요.")
  .nullable()
  .default(null);

// ── 강의 ─────────────────────────────────────────────────────────
export const videoSchema = z.object({
  provider: z.enum(["youtube", "url"]),
  url: z.string().trim().url().max(500),
});
export const lessonSchema = z.object({
  id: entityId.optional(),
  title: z.string().trim().min(1).max(120),
  video: videoSchema.nullable().default(null),
  durationSeconds: z.number().int().min(0).max(24 * 60 * 60).default(0),
  isPreview: z.boolean().default(false),
  content: html,
});
export const sectionSchema = z.object({
  id: entityId.optional(),
  title: z.string().trim().min(1).max(120),
  lessons: z.array(lessonSchema).max(200).default([]),
});
export const courseSchema = z
  .object({
    id: entityId.optional(),
    title: z.string().trim().min(1).max(120),
    slug,
    categoryId: entityId.nullable().default(null),
    instructorId: entityId.nullable().default(null),
    summary: z.string().trim().max(300).default(""),
    description: html,
    thumbnail: imageSchema.nullable().default(null),
    level: z.enum(["beginner", "intermediate", "advanced"]).default("beginner"),
    price: money,
    discountPrice: money.nullable().default(null),
    discountEndsAt: dateInput,
    status: z.enum(["draft", "published", "archived"]).default("draft"),
    sections: z.array(sectionSchema).max(50).default([]),
  })
  .superRefine((value, ctx) => {
    if (value.discountPrice !== null && value.discountPrice >= value.price)
      ctx.addIssue({
        code: "custom",
        path: ["discountPrice"],
        message: "할인가는 정가보다 낮아야 합니다.",
      });
    const lessons = value.sections.flatMap((s) => s.lessons);
    if (value.status === "published" && !lessons.length)
      ctx.addIssue({
        code: "custom",
        path: ["status"],
        message: "레슨이 하나 이상 있어야 공개할 수 있습니다.",
      });
    const ids = lessons.map((l) => l.id).filter(Boolean);
    if (new Set(ids).size !== ids.length)
      ctx.addIssue({
        code: "custom",
        path: ["sections"],
        message: "레슨이 중복됩니다.",
      });
  });
export const categorySchema = z.object({
  id: entityId.optional(),
  name: z.string().trim().min(1).max(60),
  slug: slug.pipe(z.string().max(80)),
});
export const instructorSchema = z.object({
  id: entityId.optional(),
  name: z.string().trim().min(1).max(60),
  title: z.string().trim().max(80).default(""),
  bio: z.string().trim().max(2000).default(""),
  image: imageSchema.nullable().default(null),
});

// ── 수강 ─────────────────────────────────────────────────────────
export const grantSchema = z.object({
  courseId: entityId,
  email: z.string().trim().email(),
  expiresAt: dateInput,
});
export const revokeSchema = z.object({
  enrollmentId: entityId,
  reason: z.string().trim().min(2).max(200),
});
export const progressSchema = z.object({
  lessonId: entityId,
  positionSeconds: z.number().int().min(0).max(24 * 60 * 60),
  completed: z.boolean().default(false),
});

// ── 쿠폰 ─────────────────────────────────────────────────────────
export const couponCode = z
  .string()
  .trim()
  .toUpperCase()
  .min(4)
  .max(30)
  .regex(/^[A-Z0-9-]+$/);
export const couponSchema = z
  .object({
    id: entityId.optional(),
    code: couponCode,
    name: z.string().trim().min(1).max(80),
    type: z.enum(["percent", "fixed"]),
    value: z.number().int().min(1).max(1_000_000_000),
    minAmount: money.default(0),
    maxDiscount: money.nullable().default(null),
    courseId: entityId.nullable().default(null),
    startsAt: dateInput,
    endsAt: dateInput,
    usageLimit: z.number().int().min(1).max(1_000_000).nullable().default(null),
    perUserLimit: z.number().int().min(1).max(100).default(1),
    active: z.boolean().default(true),
  })
  .superRefine((value, ctx) => {
    if (value.type === "percent" && value.value > 100)
      ctx.addIssue({
        code: "custom",
        path: ["value"],
        message: "할인율은 100% 이하여야 합니다.",
      });
    if (
      value.startsAt &&
      value.endsAt &&
      Date.parse(value.startsAt) > Date.parse(value.endsAt)
    )
      ctx.addIssue({
        code: "custom",
        path: ["endsAt"],
        message: "종료일이 시작일보다 빠릅니다.",
      });
  });

// ── 주문·결제·환불 ──────────────────────────────────────────────
export const quoteSchema = z.object({
  courseId: entityId,
  couponCode: couponCode.nullable().default(null),
});
export const checkoutSchema = quoteSchema.extend({ requestKey });
export const confirmSchema = z.object({
  orderId: z
    .string()
    .min(6)
    .max(64)
    .regex(/^[a-zA-Z0-9_-]+$/),
  paymentKey: z.string().min(1).max(200),
  amount: money.min(1),
});
export const refundSchema = z.object({
  orderId: entityId,
  requestKey,
  reason: z.string().trim().min(2).max(120),
});
export const refundRequestSchema = z.object({
  orderId: entityId,
  reason: z.string().trim().min(2).max(500),
});
export const refundDecisionSchema = z.object({
  requestId: entityId,
  approve: z.boolean(),
  note: z.string().trim().max(500).default(""),
  requestKey,
});

// ── 수강평·Q&A ───────────────────────────────────────────────────
export const reviewSchema = z.object({
  courseId: entityId,
  rating: z.number().int().min(1).max(5),
  content: z.string().trim().min(5).max(2000),
});
export const reviewReplySchema = z.object({
  reviewId: entityId,
  reply: z.string().trim().max(2000),
});
export const reviewVisibilitySchema = z.object({
  reviewId: entityId,
  hidden: z.boolean(),
});
export const questionSchema = z.object({
  courseId: entityId,
  lessonId: entityId.nullable().default(null),
  title: z.string().trim().min(2).max(120),
  content: html.pipe(z.string().min(1)),
});
export const commentSchema = z.object({
  questionId: entityId,
  content: html.pipe(z.string().min(1)),
});
export const questionStatusSchema = z.object({
  questionId: entityId,
  status: z.enum(["open", "answered", "closed"]).optional(),
  pinned: z.boolean().optional(),
});

// ── 공지·배너 ────────────────────────────────────────────────────
export const noticeSchema = z.object({
  id: entityId.optional(),
  title: z.string().trim().min(1).max(120),
  content: html,
  pinned: z.boolean().default(false),
  status: z.enum(["draft", "published"]).default("draft"),
});
export const bannerSchema = z.object({
  id: entityId.optional(),
  title: z.string().trim().min(1).max(80),
  image: imageSchema,
  linkUrl: z.string().trim().max(500).default(""),
  position: z.number().int().min(0).max(1000).default(0),
  active: z.boolean().default(true),
  startsAt: dateInput,
  endsAt: dateInput,
});

// ── 목록 필터 ────────────────────────────────────────────────────
export const listFilterSchema = z.object({
  search: z.string().trim().max(120).default(""),
  status: z.string().max(40).default(""),
});
/** 관리자 수강생·수강 목록: 강의별로 좁힌다. */
export const enrollmentFilterSchema = listFilterSchema.extend({
  courseId: z.string().max(64).default(""),
});
/** 공개 강의 목록 */
export const courseFilterSchema = z.object({
  search: z.string().trim().max(120).default(""),
  category: z.string().trim().max(80).default(""),
  level: z.string().max(20).default(""),
  sort: z
    .enum(["latest", "popular", "rating", "price_asc", "price_desc"])
    .default("latest"),
});

export type CourseInput = z.infer<typeof courseSchema>;
export type SectionInput = z.infer<typeof sectionSchema>;
export type LessonInput = z.infer<typeof lessonSchema>;
export type VideoInput = z.infer<typeof videoSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
export type InstructorInput = z.infer<typeof instructorSchema>;
export type GrantInput = z.infer<typeof grantSchema>;
export type RevokeInput = z.infer<typeof revokeSchema>;
export type ProgressInput = z.infer<typeof progressSchema>;
export type CouponInput = z.infer<typeof couponSchema>;
export type QuoteInput = z.infer<typeof quoteSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type ConfirmInput = z.infer<typeof confirmSchema>;
export type RefundInput = z.infer<typeof refundSchema>;
export type RefundRequestInput = z.infer<typeof refundRequestSchema>;
export type RefundDecisionInput = z.infer<typeof refundDecisionSchema>;
export type ReviewInput = z.infer<typeof reviewSchema>;
export type ReviewReplyInput = z.infer<typeof reviewReplySchema>;
export type ReviewVisibilityInput = z.infer<typeof reviewVisibilitySchema>;
export type QuestionInput = z.infer<typeof questionSchema>;
export type CommentInput = z.infer<typeof commentSchema>;
export type QuestionStatusInput = z.infer<typeof questionStatusSchema>;
export type NoticeInput = z.infer<typeof noticeSchema>;
export type BannerInput = z.infer<typeof bannerSchema>;
export type ListFilter = z.infer<typeof listFilterSchema>;
export type EnrollmentFilter = z.infer<typeof enrollmentFilterSchema>;
export type CourseFilter = z.infer<typeof courseFilterSchema>;
export type PaymentMode = "test" | "live";

export {
  formatMoney,
  formatDuration,
  formatOrderNumber,
  formatRating,
  youtubeVideoId,
  salePrice,
  couponDiscount,
  LESSON_COMPLETE_RATIO,
} from "./format";
export const emptyPage = <T>() => ({
  items: [] as T[],
  total: 0,
  page: 1,
  limit: 20,
  totalPages: 0,
});
export type * from "./types";
