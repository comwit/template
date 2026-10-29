import type { EnrollmentsAPI } from "@/services/app/api/enrollments";
import { LESSON_COMPLETE_RATIO, type CertificateView } from "@/lib/course";
import { findItem, mockApi, paginate } from "../runtime";
import { nowLabel } from "../labels";

export const enrollments = {
  findAll: mockApi<EnrollmentsAPI["findAll"]>((db, page) =>
    paginate(
      db.enrollments.filter((item) => item.userId === db.appUser?.id),
      page,
    ),
  ),
  player: mockApi<EnrollmentsAPI["player"]>((db, courseId) => {
    const enrollment = db.enrollments.find(
      (item) =>
        item.courseId === courseId &&
        item.userId === db.appUser?.id &&
        item.status === "active",
    );
    if (!enrollment) throw new Error("수강 중인 강의가 아닙니다.");
    if (db.player.course.id === courseId) return db.player;
    const course = findItem(db.courses, courseId);
    return {
      enrollmentId: enrollment.id,
      course: { id: course.id, title: course.title, slug: course.slug },
      sections: course.sections,
      progress: [],
      progressPercent: enrollment.progressPercent,
      completedLessons: enrollment.completedLessons,
      lessonCount: course.lessonCount,
      lastLessonId: enrollment.lastLessonId,
      certificateId: enrollment.certificateId,
    };
  }),
  saveProgress: mockApi<EnrollmentsAPI["saveProgress"]>((db, input) => {
    const player = db.player;
    const lesson = player.sections
      .flatMap((section) => section.lessons)
      .find((item) => item.id === input.lessonId);
    if (!lesson) throw new Error("레슨을 찾을 수 없습니다.");
    const completed =
      input.completed ||
      (lesson.durationSeconds > 0 &&
        input.positionSeconds >= lesson.durationSeconds * LESSON_COMPLETE_RATIO);
    const saved = player.progress.find((p) => p.lessonId === lesson.id);
    if (saved) {
      saved.positionSeconds = input.positionSeconds;
      saved.completed = saved.completed || completed;
    } else
      player.progress.push({
        lessonId: lesson.id,
        positionSeconds: input.positionSeconds,
        completed,
      });
    player.lastLessonId = lesson.id;
    player.completedLessons = player.progress.filter((p) => p.completed).length;
    player.progressPercent = player.lessonCount
      ? Math.round((player.completedLessons / player.lessonCount) * 100)
      : 0;
    const enrollment = db.enrollments.find(
      (item) => item.id === player.enrollmentId,
    );
    if (
      player.lessonCount &&
      player.completedLessons >= player.lessonCount &&
      !player.certificateId
    ) {
      const certificate: CertificateView = {
        id: crypto.randomUUID(),
        number: `CERT-2026-${String(db.certificates.length + 1).padStart(6, "0")}`,
        enrollmentId: player.enrollmentId,
        courseId: player.course.id,
        courseTitle: player.course.title,
        instructorName:
          db.courses.find((c) => c.id === player.course.id)?.instructorName ??
          null,
        userName: db.appUser?.name ?? "",
        userEmail: db.appUser?.email ?? "",
        totalDurationLabel:
          db.courses.find((c) => c.id === player.course.id)
            ?.totalDurationLabel ?? "—",
        issuedLabel: nowLabel(),
        issuedAt: new Date().toISOString(),
      };
      db.certificates.unshift(certificate);
      player.certificateId = certificate.id;
      if (enrollment) {
        enrollment.certificateId = certificate.id;
        enrollment.completedLabel = nowLabel();
      }
    }
    if (enrollment)
      Object.assign(enrollment, {
        progressPercent: player.progressPercent,
        completedLessons: player.completedLessons,
        lastLessonId: player.lastLessonId,
      });
    return {
      positionSeconds: input.positionSeconds,
      completed: saved?.completed ?? completed,
      progressPercent: player.progressPercent,
      completedLessons: player.completedLessons,
      certificateId: player.certificateId,
    };
  }),
  certificates: mockApi<EnrollmentsAPI["certificates"]>((db) =>
    db.certificates.filter((item) => item.userEmail === db.appUser?.email),
  ),
  certificate: mockApi<EnrollmentsAPI["certificate"]>((db, id) =>
    findItem(db.certificates, id),
  ),
} satisfies EnrollmentsAPI;
