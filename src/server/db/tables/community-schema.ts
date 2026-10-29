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
import { appAuthUser } from "../plugin/auth/app-schema";
import { courses, lessons } from "./catalog-schema";
import { enrollments } from "./enrollments-schema";

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
