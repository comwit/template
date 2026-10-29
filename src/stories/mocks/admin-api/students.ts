import type { AdminStudentsAPI } from "@/services/admin/api/students";
import type { EnrollmentView, ProgressDetailView } from "@/lib/course";
import { findItem, list, mockApi } from "../runtime";
import { dateLabel, nowLabel, statusLabel } from "../labels";
import { openPurchase } from "../grants";
export const adminStudents = {
  findAll: mockApi<AdminStudentsAPI["findAll"]>((db, filter, page) =>
    list(db.students, filter, page),
  ),
  enrollments: mockApi<AdminStudentsAPI["enrollments"]>((db, filter, page) =>
    list(
      filter.courseId
        ? db.enrollments.filter((item) => item.courseId === filter.courseId)
        : db.enrollments,
      filter,
      page,
    ),
  ),
  grant: mockApi<AdminStudentsAPI["grant"]>((db, input) => {
    const course = findItem(db.courses, input.courseId);
    const student = db.students.find((item) => item.email === input.email);
    if (!student) throw new Error("가입한 수강생의 이메일이 아닙니다.");
    const duplicate = db.enrollments.find(
      (item) =>
        item.courseId === course.id &&
        item.userId === student.id &&
        item.status === "active",
    );
    if (duplicate) throw new Error("이미 수강 중인 강의입니다.");
    const enrollment: EnrollmentView = {
      id: crypto.randomUUID(),
      courseId: course.id,
      courseTitle: course.title,
      courseSlug: course.slug,
      thumbnail: course.thumbnail,
      userId: student.id,
      userEmail: student.email,
      userName: student.name,
      orderId: null,
      source: "manual",
      sourceLabel: statusLabel("manual"),
      status: "active",
      statusLabel: statusLabel("active"),
      progressPercent: 0,
      completedLessons: 0,
      lessonCount: course.lessonCount,
      lastLessonId: null,
      startedLabel: nowLabel(),
      completedLabel: null,
      expiresLabel: dateLabel(input.expiresAt),
      certificateId: null,
    };
    db.enrollments.unshift(enrollment);
    student.enrollmentCount += 1;
    course.enrollmentCount += 1;
    return enrollment.id;
  }),
  revoke: mockApi<AdminStudentsAPI["revoke"]>((db, input) => {
    Object.assign(findItem(db.enrollments, input.enrollmentId), {
      status: "revoked",
      statusLabel: statusLabel("revoked"),
    });
  }),
  progress: mockApi<AdminStudentsAPI["progress"]>((db, enrollmentId) => {
    const enrollment = findItem(db.enrollments, enrollmentId);
    const lessons = (
      db.player.course.id === enrollment.courseId
        ? db.player.sections
        : (db.courses.find((c) => c.id === enrollment.courseId)?.sections ?? [])
    ).flatMap((section) => section.lessons);
    const rows: ProgressDetailView[] = [];
    for (const lesson of lessons) {
      const saved =
        enrollment.id === db.player.enrollmentId
          ? db.player.progress.find((p) => p.lessonId === lesson.id)
          : undefined;
      if (!saved) continue;
      rows.push({
        ...saved,
        lessonTitle: lesson.title,
        updatedLabel: enrollment.startedLabel,
      });
    }
    return rows;
  }),
  /** filter.courseId 는 상품 id 로 쓴다(API 계약). */
  purchases: mockApi<AdminStudentsAPI["purchases"]>((db, filter, page) =>
    list(
      filter.courseId
        ? db.purchases.filter((item) => item.productId === filter.courseId)
        : db.purchases,
      filter,
      page,
    ),
  ),
  grantPurchase: mockApi<AdminStudentsAPI["grantPurchase"]>((db, input) => {
    const product = findItem(db.products, input.productId);
    const student = db.students.find((item) => item.email === input.email);
    if (!student) throw new Error("가입한 수강생의 이메일이 아닙니다.");
    const duplicate = db.purchases.find(
      (item) =>
        item.productId === product.id &&
        item.userId === student.id &&
        item.status === "active",
    );
    if (duplicate) throw new Error("이미 구매한 상품입니다.");
    return openPurchase(db, product.id, {
      userId: student.id,
      userEmail: student.email,
      userName: student.name,
      source: "manual",
      orderId: null,
    }).id;
  }),
  revokePurchase: mockApi<AdminStudentsAPI["revokePurchase"]>((db, input) => {
    Object.assign(findItem(db.purchases, input.purchaseId), {
      status: "revoked",
      statusLabel: statusLabel("revoked"),
    });
  }),
} satisfies AdminStudentsAPI;
