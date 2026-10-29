import type { CommunityAPI } from "@/services/app/api/community";
import { formatRating } from "@/lib/course";
import { findItem, mockApi } from "../runtime";
import { nowLabel, statusLabel } from "../labels";

function requireUser(db: { appUser: { id: string; name: string } | null }) {
  if (!db.appUser) throw new Error("로그인이 필요합니다.");
  return db.appUser;
}

export const community = {
  writeReview: mockApi<CommunityAPI["writeReview"]>((db, input) => {
    const me = requireUser(db);
    const course = findItem(db.courses, input.courseId);
    if (
      !db.enrollments.some(
        (item) => item.courseId === course.id && item.userId === me.id,
      )
    )
      throw new Error("수강 중인 강의에만 수강평을 남길 수 있습니다.");
    const previous = db.reviews.find(
      (item) => item.courseId === course.id && item.userId === me.id,
    );
    const id = previous?.id ?? crypto.randomUUID();
    const review = {
      id,
      courseId: course.id,
      courseTitle: course.title,
      userId: me.id,
      userName: me.name,
      rating: input.rating,
      content: input.content,
      status: "visible" as const,
      statusLabel: statusLabel("visible"),
      adminReply: previous?.adminReply ?? null,
      adminRepliedLabel: previous?.adminRepliedLabel ?? null,
      createdLabel: previous?.createdLabel ?? nowLabel(),
    };
    if (previous) Object.assign(previous, review);
    else db.reviews.unshift(review);
    const visible = db.reviews.filter(
      (item) => item.courseId === course.id && item.status === "visible",
    );
    const sum = visible.reduce((s, item) => s + item.rating, 0);
    course.reviewCount = visible.length;
    course.rating = visible.length
      ? Math.round((sum / visible.length) * 10) / 10
      : null;
    course.ratingLabel = formatRating(sum, visible.length);
    return id;
  }),
  askQuestion: mockApi<CommunityAPI["askQuestion"]>((db, input) => {
    const me = requireUser(db);
    const course = findItem(db.courses, input.courseId);
    const lesson = course.sections
      .flatMap((section) => section.lessons)
      .find((item) => item.id === input.lessonId);
    const id = crypto.randomUUID();
    db.questions.unshift({
      id,
      courseId: course.id,
      courseTitle: course.title,
      lessonId: lesson?.id ?? null,
      lessonTitle: lesson?.title ?? null,
      userId: me.id,
      userName: me.name,
      title: input.title,
      content: input.content,
      status: "open",
      statusLabel: statusLabel("open"),
      pinned: false,
      commentCount: 0,
      createdLabel: nowLabel(),
      comments: [],
    });
    db.dashboard.openQuestions += 1;
    return id;
  }),
  comment: mockApi<CommunityAPI["comment"]>((db, input) => {
    const me = requireUser(db);
    const question = findItem(db.questions, input.questionId);
    if (question.status === "closed")
      throw new Error("닫힌 질문에는 댓글을 달 수 없습니다.");
    const id = crypto.randomUUID();
    question.comments.push({
      id,
      questionId: question.id,
      authorType: "user",
      authorName: me.name,
      content: input.content,
      isAnswer: false,
      createdLabel: nowLabel(),
    });
    question.commentCount = question.comments.length;
    return id;
  }),
} satisfies CommunityAPI;
