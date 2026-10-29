import type { CatalogAPI } from "@/services/app/api/catalog";
import type { CourseView } from "@/lib/course";
import { findItem, list, mockApi, paginate } from "../runtime";
import type { MockData } from "../data";

const published = (db: MockData) =>
  db.courses.filter((course) => course.status === "published");
/** 공개 상세: 로그인 수강생이 수강 중이면 enrollment 를 채운다. */
function withEnrollment(db: MockData, course: CourseView): CourseView {
  const enrollment = db.enrollments.find(
    (item) =>
      item.courseId === course.id &&
      item.userId === db.appUser?.id &&
      item.status === "active",
  );
  return {
    ...course,
    enrollment: enrollment
      ? {
          id: enrollment.id,
          progressPercent: enrollment.progressPercent,
          lastLessonId: enrollment.lastLessonId,
        }
      : null,
  };
}

export const catalog = {
  findAll: mockApi<CatalogAPI["findAll"]>((db, filter, page) => {
    const slug = (filter.category ?? "").trim();
    const categoryId = db.categories.find((c) => c.slug === slug)?.id;
    let items = published(db).filter(
      (course) =>
        (!slug || course.categoryId === categoryId) &&
        (!filter.level || course.level === filter.level),
    );
    items = [...items].sort((a, b) => {
      switch (filter.sort) {
        case "popular":
          return b.enrollmentCount - a.enrollmentCount;
        case "rating":
          return (b.rating ?? 0) - (a.rating ?? 0);
        case "price_asc":
          return a.salePrice - b.salePrice;
        case "price_desc":
          return b.salePrice - a.salePrice;
        default:
          return 0;
      }
    });
    return list(items, { search: filter.search }, page);
  }),
  find: mockApi<CatalogAPI["find"]>((db, id) =>
    withEnrollment(db, findItem(published(db), id)),
  ),
  categories: mockApi<CatalogAPI["categories"]>((db) => db.categories),
  reviews: mockApi<CatalogAPI["reviews"]>((db, courseId, page) =>
    paginate(
      db.reviews.filter(
        (review) => review.courseId === courseId && review.status === "visible",
      ),
      page,
    ),
  ),
  questions: mockApi<CatalogAPI["questions"]>((db, courseId, lessonId, page) =>
    paginate(
      db.questions
        .filter(
          (question) =>
            question.courseId === courseId &&
            (!lessonId || question.lessonId === lessonId),
        )
        .sort((a, b) => Number(b.pinned) - Number(a.pinned)),
      page,
    ),
  ),
  question: mockApi<CatalogAPI["question"]>((db, id) =>
    findItem(db.questions, id),
  ),
} satisfies CatalogAPI;
