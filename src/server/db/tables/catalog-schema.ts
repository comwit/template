import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { id, timestamps } from "./shared-schema";

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
