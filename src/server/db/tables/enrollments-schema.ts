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
