import "server-only";
import { atomic, type AddStatement } from "./atomic";
import { and, count, desc, eq, isNull, like, or, sql } from "drizzle-orm";
import { getDb } from "@/server/db";
import {
  appAuthUser,
  certificates,
  courses,
  enrollments,
  instructors,
  lessonProgress,
  lessons,
} from "@/server/db/schema";
import {
  LESSON_COMPLETE_RATIO,
  type EnrollmentFilter,
  type GrantInput,
  type ProgressInput,
  type RevokeInput,
} from "@/lib/course";
import { findCurriculum, findLessonIds } from "./catalog";
import {
  audit,
  ensure,
  offset,
  paginate,
  stamp,
  toDate,
  updated,
  type Executor,
} from "./support";
import { uuid } from "./id";
import type { PageRequest } from "./types";

export type EnrollmentRow = typeof enrollments.$inferSelect & {
  course: Pick<
    typeof courses.$inferSelect,
    "id" | "title" | "slug" | "thumbnail" | "lessonCount"
  >;
  user: Pick<typeof appAuthUser.$inferSelect, "id" | "email" | "name">;
  certificateId: string | null;
};

const enrollmentSelect = {
  enrollment: enrollments,
  course: {
    id: courses.id,
    title: courses.title,
    slug: courses.slug,
    thumbnail: courses.thumbnail,
    lessonCount: courses.lessonCount,
  },
  user: { id: appAuthUser.id, email: appAuthUser.email, name: appAuthUser.name },
  certificateId: certificates.id,
} as const;
const shape = (
  rows: {
    enrollment: typeof enrollments.$inferSelect;
    course: EnrollmentRow["course"];
    user: EnrollmentRow["user"];
    certificateId: string | null;
  }[],
): EnrollmentRow[] =>
  rows.map((r) => ({
    ...r.enrollment,
    course: r.course,
    user: r.user,
    certificateId: r.certificateId,
  }));

/**
 * 결제 승인·무료 신청·수동 부여가 모두 이 함수로 수강을 연다. 같은 배치 안에서 호출한다.
 * 이미 회수·만료된 수강은 다시 활성화하고, 새 수강이면 강의 수강생 수를 올린다.
 */
export async function enroll(
  tx: Executor,
  add: AddStatement,
  input: {
    courseId: string;
    userId: string;
    source: "order" | "free" | "manual";
    orderId?: string | null;
    grantedBy?: string | null;
    expiresAt?: Date | null;
  },
) {
  const [existing] = await tx
    .select()
    .from(enrollments)
    .where(
      and(
        eq(enrollments.courseId, input.courseId),
        eq(enrollments.userId, input.userId),
      ),
    );
  if (existing) {
    if (existing.status === "active") return existing.id;
    add(
      tx
        .update(enrollments)
        .set({
          status: "active",
          source: input.source,
          orderId: input.orderId ?? existing.orderId,
          grantedBy: input.grantedBy ?? null,
          expiresAt: input.expiresAt ?? null,
          revokeReason: null,
          ...updated(),
        })
        .where(eq(enrollments.id, existing.id)),
    );
    return existing.id;
  }
  const id = uuid();
  add(
    tx.insert(enrollments).values({
      id,
      courseId: input.courseId,
      userId: input.userId,
      orderId: input.orderId ?? null,
      source: input.source,
      grantedBy: input.grantedBy ?? null,
      expiresAt: input.expiresAt ?? null,
      ...stamp(),
    }),
  );
  add(
    tx
      .update(courses)
      .set({
        enrollmentCount: sql`${courses.enrollmentCount} + 1`,
        ...updated(),
      })
      .where(eq(courses.id, input.courseId)),
  );
  return id;
}

export async function revokeByOrder(
  tx: Executor,
  add: AddStatement,
  orderId: string,
  reason: string,
) {
  const rows = await tx
    .select()
    .from(enrollments)
    .where(and(eq(enrollments.orderId, orderId), eq(enrollments.status, "active")));
  for (const row of rows)
    add(
      tx
        .update(enrollments)
        .set({ status: "revoked", revokeReason: reason, ...updated() })
        .where(eq(enrollments.id, row.id)),
    );
}

export async function findAll(filter: EnrollmentFilter, pageable: PageRequest) {
  const db = await getDb();
  const where = and(
    isNull(enrollments.deletedAt),
    filter.courseId ? eq(enrollments.courseId, filter.courseId) : undefined,
    filter.status
      ? eq(enrollments.status, filter.status as EnrollmentRow["status"])
      : undefined,
    filter.search
      ? or(
          like(appAuthUser.email, `%${filter.search}%`),
          like(appAuthUser.name, `%${filter.search}%`),
          like(courses.title, `%${filter.search}%`),
        )
      : undefined,
  );
  const base = () =>
    db
      .select(enrollmentSelect)
      .from(enrollments)
      .innerJoin(courses, eq(courses.id, enrollments.courseId))
      .innerJoin(appAuthUser, eq(appAuthUser.id, enrollments.userId))
      .leftJoin(certificates, eq(certificates.enrollmentId, enrollments.id))
      .where(where);
  const rows = await base()
    .orderBy(desc(enrollments.createdAt), desc(enrollments.id))
    .limit(pageable.limit)
    .offset(offset(pageable));
  const [total] = await db
    .select({ value: count() })
    .from(enrollments)
    .innerJoin(courses, eq(courses.id, enrollments.courseId))
    .innerJoin(appAuthUser, eq(appAuthUser.id, enrollments.userId))
    .where(where);
  return paginate(shape(rows), total.value, pageable);
}

export async function findByUser(userId: string, pageable: PageRequest) {
  const db = await getDb();
  const where = and(
    isNull(enrollments.deletedAt),
    eq(enrollments.userId, userId),
    eq(enrollments.status, "active"),
  );
  const rows = await db
    .select(enrollmentSelect)
    .from(enrollments)
    .innerJoin(courses, eq(courses.id, enrollments.courseId))
    .innerJoin(appAuthUser, eq(appAuthUser.id, enrollments.userId))
    .leftJoin(certificates, eq(certificates.enrollmentId, enrollments.id))
    .where(where)
    .orderBy(desc(enrollments.updatedAt))
    .limit(pageable.limit)
    .offset(offset(pageable));
  const [total] = await db
    .select({ value: count() })
    .from(enrollments)
    .where(where);
  return paginate(shape(rows), total.value, pageable);
}

export async function findById(id: string) {
  const db = await getDb();
  const [row] = await db
    .select(enrollmentSelect)
    .from(enrollments)
    .innerJoin(courses, eq(courses.id, enrollments.courseId))
    .innerJoin(appAuthUser, eq(appAuthUser.id, enrollments.userId))
    .leftJoin(certificates, eq(certificates.enrollmentId, enrollments.id))
    .where(and(eq(enrollments.id, id), isNull(enrollments.deletedAt)));
  ensure(row, "수강 정보를 찾을 수 없습니다.", "NOT_FOUND");
  return shape([row])[0];
}

export async function findActive(courseId: string, userId: string) {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(enrollments)
    .where(
      and(
        eq(enrollments.courseId, courseId),
        eq(enrollments.userId, userId),
        eq(enrollments.status, "active"),
      ),
    );
  return row ?? null;
}

/** 관리자가 이메일로 수강 권한을 수동 부여한다. */
export async function grant(input: GrantInput, actorId: string) {
  const db = await getDb();
  return atomic(async (tx, add) => {
    const [user] = await tx
      .select({ id: appAuthUser.id })
      .from(appAuthUser)
      .where(eq(appAuthUser.email, input.email));
    ensure(user, "해당 이메일로 가입한 회원이 없습니다.");
    const [course] = await tx
      .select({ id: courses.id })
      .from(courses)
      .where(and(eq(courses.id, input.courseId), isNull(courses.deletedAt)));
    ensure(course, "강의를 찾을 수 없습니다.");
    const id = await enroll(tx, add, {
      courseId: input.courseId,
      userId: user.id,
      source: "manual",
      grantedBy: actorId,
      expiresAt: toDate(input.expiresAt),
    });
    add(audit(tx, actorId, "enrollment.granted", id, { courseId: input.courseId }));
    return id;
  });
}

export async function revoke(input: RevokeInput, actorId: string) {
  const db = await getDb();
  await atomic(async (tx, add) => {
    const [row] = await tx
      .select()
      .from(enrollments)
      .where(eq(enrollments.id, input.enrollmentId));
    ensure(row, "수강 정보를 찾을 수 없습니다.");
    ensure(row.status === "active", "이미 회수된 수강입니다.");
    add(
      tx
        .update(enrollments)
        .set({ status: "revoked", revokeReason: input.reason, ...updated() })
        .where(eq(enrollments.id, input.enrollmentId)),
    );
    add(
      audit(tx, actorId, "enrollment.revoked", input.enrollmentId, {
        reason: input.reason,
      }),
    );
  });
}

/** 강의실: 수강 중인 강의의 커리큘럼(영상 포함)·진도·수료증 */
export async function player(courseId: string, userId: string) {
  const db = await getDb();
  const enrollment = await findActive(courseId, userId);
  ensure(enrollment, "수강 중인 강의가 아닙니다.", "NOT_ENROLLED");
  if (enrollment.expiresAt && enrollment.expiresAt <= new Date()) {
    await atomic(async (tx, add) => {
      add(
        tx
          .update(enrollments)
          .set({ status: "expired", ...updated() })
          .where(eq(enrollments.id, enrollment.id)),
      );
    });
    ensure(false, "수강 기간이 끝났습니다.", "NOT_ENROLLED");
  }
  const [course] = await db
    .select({ id: courses.id, title: courses.title, slug: courses.slug, lessonCount: courses.lessonCount })
    .from(courses)
    .where(and(eq(courses.id, courseId), isNull(courses.deletedAt)));
  ensure(course, "강의를 찾을 수 없습니다.", "NOT_FOUND");
  const [sections, progress, certificate] = await Promise.all([
    findCurriculum(db, courseId),
    db
      .select()
      .from(lessonProgress)
      .where(eq(lessonProgress.enrollmentId, enrollment.id)),
    db
      .select({ id: certificates.id })
      .from(certificates)
      .where(eq(certificates.enrollmentId, enrollment.id)),
  ]);
  return {
    enrollment,
    course,
    sections,
    progress,
    certificateId: certificate[0]?.id ?? null,
  };
}

export async function findProgress(enrollmentId: string) {
  const db = await getDb();
  const rows = await db
    .select({ progress: lessonProgress, lessonTitle: lessons.title })
    .from(lessonProgress)
    .innerJoin(lessons, eq(lessons.id, lessonProgress.lessonId))
    .where(eq(lessonProgress.enrollmentId, enrollmentId))
    .orderBy(desc(lessonProgress.updatedAt));
  return rows.map((r) => ({ ...r.progress, lessonTitle: r.lessonTitle }));
}

/**
 * 재생 위치 저장. 플레이어가 10~15초마다 부르는 경로라 전역 revision 가드(atomic)를 타지 않는다.
 * 레슨 진도 upsert 와 수강 진도율 갱신, 100% 도달 시 수료증 발급을 한 batch 로 쓴다.
 */
export async function saveProgress(userId: string, input: ProgressInput) {
  const db = await getDb();
  const [lesson] = await db
    .select()
    .from(lessons)
    .where(and(eq(lessons.id, input.lessonId), isNull(lessons.deletedAt)));
  ensure(lesson, "레슨을 찾을 수 없습니다.", "NOT_FOUND");
  const enrollment = await findActive(lesson.courseId, userId);
  ensure(enrollment, "수강 중인 강의가 아닙니다.", "NOT_ENROLLED");
  const [current] = await db
    .select()
    .from(lessonProgress)
    .where(
      and(
        eq(lessonProgress.enrollmentId, enrollment.id),
        eq(lessonProgress.lessonId, lesson.id),
      ),
    );
  const position = Math.max(current?.positionSeconds ?? 0, input.positionSeconds);
  const completed =
    Boolean(current?.completed) ||
    input.completed ||
    (lesson.durationSeconds > 0 &&
      position >= lesson.durationSeconds * LESSON_COMPLETE_RATIO);
  const now = new Date();
  const allLessons = await findLessonIds(db, lesson.courseId);
  const completedRows = await db
    .select({ lessonId: lessonProgress.lessonId })
    .from(lessonProgress)
    .where(
      and(
        eq(lessonProgress.enrollmentId, enrollment.id),
        eq(lessonProgress.completed, true),
      ),
    );
  const completedIds = new Set(completedRows.map((r) => r.lessonId));
  if (completed) completedIds.add(lesson.id);
  const completedLessons = allLessons.filter((l) => completedIds.has(l.id)).length;
  const progressPercent = allLessons.length
    ? Math.min(100, Math.round((completedLessons / allLessons.length) * 100))
    : 0;
  const finished = allLessons.length > 0 && completedLessons === allLessons.length;
  const statements = [
    current
      ? db
          .update(lessonProgress)
          .set({
            positionSeconds: position,
            completed,
            completedAt: current.completedAt ?? (completed ? now : null),
            ...updated(),
          })
          .where(eq(lessonProgress.id, current.id))
      : db.insert(lessonProgress).values({
          id: uuid(),
          enrollmentId: enrollment.id,
          lessonId: lesson.id,
          positionSeconds: position,
          completed,
          completedAt: completed ? now : null,
          ...stamp(),
        }),
    db
      .update(enrollments)
      .set({
        progressPercent,
        completedLessons,
        lastLessonId: lesson.id,
        completedAt: enrollment.completedAt ?? (finished ? now : null),
        ...updated(),
      })
      .where(eq(enrollments.id, enrollment.id)),
  ] as const;
  let certificateId: string | null = null;
  if (finished) {
    const [existing] = await db
      .select({ id: certificates.id })
      .from(certificates)
      .where(eq(certificates.enrollmentId, enrollment.id));
    certificateId = existing?.id ?? null;
    if (!existing) {
      certificateId = uuid();
      await db.batch([
        ...statements,
        db
          .insert(certificates)
          .values({
            id: certificateId,
            number: `CERT-${now.getFullYear()}-${certificateId.slice(-8).toUpperCase()}`,
            enrollmentId: enrollment.id,
            courseId: lesson.courseId,
            userId,
            issuedAt: now,
            ...stamp(),
          })
          .onConflictDoNothing({ target: certificates.enrollmentId }),
      ]);
      return { positionSeconds: position, completed, progressPercent, completedLessons, certificateId };
    }
  }
  await db.batch([...statements]);
  return { positionSeconds: position, completed, progressPercent, completedLessons, certificateId };
}

export async function findCertificate(id: string, userId?: string) {
  const db = await getDb();
  const [row] = await db
    .select({
      certificate: certificates,
      courseTitle: courses.title,
      totalDurationSeconds: courses.totalDurationSeconds,
      instructorName: instructors.name,
      userName: appAuthUser.name,
      userEmail: appAuthUser.email,
    })
    .from(certificates)
    .innerJoin(courses, eq(courses.id, certificates.courseId))
    .leftJoin(instructors, eq(instructors.id, courses.instructorId))
    .innerJoin(appAuthUser, eq(appAuthUser.id, certificates.userId))
    .where(
      and(
        eq(certificates.id, id),
        userId ? eq(certificates.userId, userId) : undefined,
      ),
    );
  ensure(row, "수료증을 찾을 수 없습니다.", "NOT_FOUND");
  return row;
}

export async function findCertificatesByUser(userId: string) {
  const db = await getDb();
  return db
    .select({
      certificate: certificates,
      courseTitle: courses.title,
      totalDurationSeconds: courses.totalDurationSeconds,
      instructorName: instructors.name,
      userName: appAuthUser.name,
      userEmail: appAuthUser.email,
    })
    .from(certificates)
    .innerJoin(courses, eq(courses.id, certificates.courseId))
    .leftJoin(instructors, eq(instructors.id, courses.instructorId))
    .innerJoin(appAuthUser, eq(appAuthUser.id, certificates.userId))
    .where(eq(certificates.userId, userId))
    .orderBy(desc(certificates.issuedAt));
}
