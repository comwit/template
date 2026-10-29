import "server-only";
import { atomic } from "./atomic";
import { and, count, desc, eq, isNull, like, or, sql } from "drizzle-orm";
import { getDb } from "@/server/db";
import {
  appAuthUser,
  courses,
  enrollments,
  lessons,
  questionComments,
  questions,
  reviews,
} from "@/server/db/schema";
import type {
  CommentInput,
  ListFilter,
  QuestionInput,
  QuestionStatusInput,
  ReviewInput,
  ReviewReplyInput,
  ReviewVisibilityInput,
} from "@/lib/course";
import { audit, ensure, offset, paginate, stamp, updated } from "./support";
import { uuid } from "./id";
import type { PageRequest } from "./types";

// ── 수강평 ───────────────────────────────────────────────────────
const reviewSelect = {
  review: reviews,
  courseTitle: courses.title,
  userName: appAuthUser.name,
} as const;
export async function findReviews(
  filter: ListFilter,
  pageable: PageRequest,
  scope: { courseId?: string; publicOnly?: boolean } = {},
) {
  const db = await getDb();
  const where = and(
    isNull(reviews.deletedAt),
    scope.courseId ? eq(reviews.courseId, scope.courseId) : undefined,
    scope.publicOnly
      ? eq(reviews.status, "visible")
      : filter.status
        ? eq(reviews.status, filter.status as "visible" | "hidden")
        : undefined,
    filter.search
      ? or(
          like(courses.title, `%${filter.search}%`),
          like(reviews.content, `%${filter.search}%`),
          like(appAuthUser.email, `%${filter.search}%`),
        )
      : undefined,
  );
  const rows = await db
    .select(reviewSelect)
    .from(reviews)
    .innerJoin(courses, eq(courses.id, reviews.courseId))
    .innerJoin(appAuthUser, eq(appAuthUser.id, reviews.userId))
    .where(where)
    .orderBy(desc(reviews.createdAt), desc(reviews.id))
    .limit(pageable.limit)
    .offset(offset(pageable));
  const [total] = await db
    .select({ value: count() })
    .from(reviews)
    .innerJoin(courses, eq(courses.id, reviews.courseId))
    .innerJoin(appAuthUser, eq(appAuthUser.id, reviews.userId))
    .where(where);
  return paginate(rows, total.value, pageable);
}
/** 수강 중인 회원만, 강의당 한 개. 다시 쓰면 평점·내용을 덮어쓴다. */
export async function writeReview(input: ReviewInput, userId: string) {
  const db = await getDb();
  return atomic(async (tx, add) => {
    const [enrollment] = await tx
      .select({ id: enrollments.id })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.courseId, input.courseId),
          eq(enrollments.userId, userId),
          eq(enrollments.status, "active"),
        ),
      );
    ensure(enrollment, "수강 중인 강의에만 수강평을 남길 수 있습니다.");
    const [existing] = await tx
      .select()
      .from(reviews)
      .where(and(eq(reviews.courseId, input.courseId), eq(reviews.userId, userId)));
    const id = existing?.id ?? uuid();
    if (existing) {
      add(
        tx
          .update(reviews)
          .set({
            rating: input.rating,
            content: input.content,
            deletedAt: null,
            ...updated(),
          })
          .where(eq(reviews.id, id)),
      );
      add(
        tx
          .update(courses)
          .set({
            ratingSum: sql`${courses.ratingSum} - ${existing.rating} + ${input.rating}`,
            ...updated(),
          })
          .where(eq(courses.id, input.courseId)),
      );
    } else {
      add(
        tx.insert(reviews).values({
          id,
          courseId: input.courseId,
          userId,
          enrollmentId: enrollment.id,
          rating: input.rating,
          content: input.content,
          ...stamp(),
        }),
      );
      add(
        tx
          .update(courses)
          .set({
            ratingSum: sql`${courses.ratingSum} + ${input.rating}`,
            reviewCount: sql`${courses.reviewCount} + 1`,
            ...updated(),
          })
          .where(eq(courses.id, input.courseId)),
      );
    }
    add(audit(tx, userId, existing ? "review.updated" : "review.created", id));
    return id;
  });
}
export async function replyReview(input: ReviewReplyInput, actorId: string) {
  const db = await getDb();
  await atomic(async (tx, add) => {
    const rows = await tx
      .select({ id: reviews.id })
      .from(reviews)
      .where(and(eq(reviews.id, input.reviewId), isNull(reviews.deletedAt)));
    ensure(rows.length, "수강평을 찾을 수 없습니다.");
    add(
      tx
        .update(reviews)
        .set({
          adminReply: input.reply || null,
          adminRepliedAt: input.reply ? new Date() : null,
          ...updated(),
        })
        .where(eq(reviews.id, input.reviewId)),
    );
    add(audit(tx, actorId, "review.replied", input.reviewId));
  });
}
export async function setReviewVisibility(
  input: ReviewVisibilityInput,
  actorId: string,
) {
  const db = await getDb();
  await atomic(async (tx, add) => {
    const rows = await tx
      .select({ id: reviews.id })
      .from(reviews)
      .where(and(eq(reviews.id, input.reviewId), isNull(reviews.deletedAt)));
    ensure(rows.length, "수강평을 찾을 수 없습니다.");
    add(
      tx
        .update(reviews)
        .set({ status: input.hidden ? "hidden" : "visible", ...updated() })
        .where(eq(reviews.id, input.reviewId)),
    );
    add(audit(tx, actorId, input.hidden ? "review.hidden" : "review.shown", input.reviewId));
  });
}

// ── Q&A ──────────────────────────────────────────────────────────
const questionSelect = {
  question: questions,
  courseTitle: courses.title,
  lessonTitle: lessons.title,
  userName: appAuthUser.name,
} as const;
export async function findQuestions(
  filter: ListFilter,
  pageable: PageRequest,
  scope: { courseId?: string; lessonId?: string | null; userId?: string } = {},
) {
  const db = await getDb();
  const where = and(
    isNull(questions.deletedAt),
    scope.courseId ? eq(questions.courseId, scope.courseId) : undefined,
    scope.lessonId ? eq(questions.lessonId, scope.lessonId) : undefined,
    scope.userId ? eq(questions.userId, scope.userId) : undefined,
    filter.status
      ? eq(questions.status, filter.status as "open" | "answered" | "closed")
      : undefined,
    filter.search
      ? or(
          like(questions.title, `%${filter.search}%`),
          like(courses.title, `%${filter.search}%`),
          like(appAuthUser.email, `%${filter.search}%`),
        )
      : undefined,
  );
  const rows = await db
    .select(questionSelect)
    .from(questions)
    .innerJoin(courses, eq(courses.id, questions.courseId))
    .leftJoin(lessons, eq(lessons.id, questions.lessonId))
    .innerJoin(appAuthUser, eq(appAuthUser.id, questions.userId))
    .where(where)
    .orderBy(desc(questions.pinned), desc(questions.createdAt), desc(questions.id))
    .limit(pageable.limit)
    .offset(offset(pageable));
  const [total] = await db
    .select({ value: count() })
    .from(questions)
    .innerJoin(courses, eq(courses.id, questions.courseId))
    .innerJoin(appAuthUser, eq(appAuthUser.id, questions.userId))
    .where(where);
  return paginate(rows, total.value, pageable);
}
export async function findQuestion(id: string) {
  const db = await getDb();
  const [row] = await db
    .select(questionSelect)
    .from(questions)
    .innerJoin(courses, eq(courses.id, questions.courseId))
    .leftJoin(lessons, eq(lessons.id, questions.lessonId))
    .innerJoin(appAuthUser, eq(appAuthUser.id, questions.userId))
    .where(and(eq(questions.id, id), isNull(questions.deletedAt)));
  ensure(row, "질문을 찾을 수 없습니다.", "NOT_FOUND");
  const comments = await db
    .select()
    .from(questionComments)
    .where(and(eq(questionComments.questionId, id), isNull(questionComments.deletedAt)))
    .orderBy(questionComments.createdAt);
  return { ...row, comments };
}
export async function askQuestion(input: QuestionInput, userId: string) {
  const db = await getDb();
  return atomic(async (tx, add) => {
    const [enrollment] = await tx
      .select({ id: enrollments.id })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.courseId, input.courseId),
          eq(enrollments.userId, userId),
          eq(enrollments.status, "active"),
        ),
      );
    ensure(enrollment, "수강 중인 강의에만 질문할 수 있습니다.");
    if (input.lessonId) {
      const [lesson] = await tx
        .select({ id: lessons.id })
        .from(lessons)
        .where(
          and(
            eq(lessons.id, input.lessonId),
            eq(lessons.courseId, input.courseId),
            isNull(lessons.deletedAt),
          ),
        );
      ensure(lesson, "레슨을 찾을 수 없습니다.");
    }
    const id = uuid();
    add(
      tx.insert(questions).values({
        id,
        courseId: input.courseId,
        lessonId: input.lessonId,
        userId,
        title: input.title,
        content: input.content,
        ...stamp(),
      }),
    );
    add(audit(tx, userId, "question.created", id));
    return id;
  });
}
/** 수강생 댓글과 운영자 답변이 같은 테이블에 쌓인다. 운영자 답변은 질문을 answered 로 바꾼다. */
export async function addComment(
  input: CommentInput,
  author: { id: string; name: string; type: "user" | "admin" },
) {
  const db = await getDb();
  return atomic(async (tx, add) => {
    const [question] = await tx
      .select()
      .from(questions)
      .where(and(eq(questions.id, input.questionId), isNull(questions.deletedAt)));
    ensure(question, "질문을 찾을 수 없습니다.");
    ensure(question.status !== "closed", "닫힌 질문에는 댓글을 달 수 없습니다.");
    if (author.type === "user") {
      const [enrollment] = await tx
        .select({ id: enrollments.id })
        .from(enrollments)
        .where(
          and(
            eq(enrollments.courseId, question.courseId),
            eq(enrollments.userId, author.id),
            eq(enrollments.status, "active"),
          ),
        );
      ensure(enrollment, "수강 중인 강의에만 댓글을 남길 수 있습니다.");
    }
    const id = uuid();
    add(
      tx.insert(questionComments).values({
        id,
        questionId: question.id,
        authorType: author.type,
        authorId: author.id,
        authorName: author.name,
        content: input.content,
        isAnswer: author.type === "admin",
        ...stamp(),
      }),
    );
    add(
      tx
        .update(questions)
        .set({
          commentCount: sql`${questions.commentCount} + 1`,
          ...(author.type === "admin" && question.status === "open"
            ? { status: "answered" as const, answeredAt: new Date() }
            : {}),
          ...updated(),
        })
        .where(eq(questions.id, question.id)),
    );
    add(audit(tx, author.id, "question.commented", question.id, { commentId: id }));
    return id;
  });
}
export async function setQuestionStatus(
  input: QuestionStatusInput,
  actorId: string,
) {
  const db = await getDb();
  await atomic(async (tx, add) => {
    const rows = await tx
      .select({ id: questions.id })
      .from(questions)
      .where(and(eq(questions.id, input.questionId), isNull(questions.deletedAt)));
    ensure(rows.length, "질문을 찾을 수 없습니다.");
    add(
      tx
        .update(questions)
        .set({
          ...(input.status ? { status: input.status } : {}),
          ...(input.pinned !== undefined ? { pinned: input.pinned } : {}),
          ...updated(),
        })
        .where(eq(questions.id, input.questionId)),
    );
    add(audit(tx, actorId, "question.updated", input.questionId, input));
  });
}
