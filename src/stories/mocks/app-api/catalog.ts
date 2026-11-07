import type { CatalogAPI } from "@/services/app/api/catalog";
import type { CourseView, ProductView } from "@/lib/course";
import { findItem, list, mockApi, paginate } from "../runtime";
import type { MockData } from "../data";

const published = (db: MockData) =>
  db.courses.filter((course) => course.status === "published");
const publishedProducts = (db: MockData) =>
  db.products.filter((product) => product.status === "published");
/** 공개 상품 상세: 로그인 사용자가 이미 샀으면 purchase 를 채운다. */
function withPurchase(db: MockData, product: ProductView): ProductView {
  const purchase = db.purchases.find(
    (item) =>
      item.productId === product.id &&
      item.userId === db.appUser?.id &&
      item.status === "active",
  );
  return {
    ...product,
    purchase: purchase
      ? { id: purchase.id, downloadCount: purchase.downloadCount }
      : null,
  };
}
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
  // 실제 API 처럼 없는·비공개 강의는 null (상세 화면의 "없는 강의").
  find: mockApi<CatalogAPI["find"]>((db, id) => {
    const course = published(db).find((item) => item.id === id);
    return course ? withEnrollment(db, course) : null;
  }),
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
  products: mockApi<CatalogAPI["products"]>((db, filter, page) => {
    const slug = (filter.category ?? "").trim();
    const categoryId = db.categories.find((c) => c.slug === slug)?.id;
    const items = publishedProducts(db)
      .filter(
        (product) =>
          (!slug || product.categoryId === categoryId) &&
          (!filter.kind || product.kind === filter.kind),
      )
      .sort((a, b) => {
        switch (filter.sort) {
          case "popular":
            return b.purchaseCount - a.purchaseCount;
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
  product: mockApi<CatalogAPI["product"]>((db, id) => {
    const product = publishedProducts(db).find((item) => item.id === id);
    return product ? withPurchase(db, product) : null;
  }),
} satisfies CatalogAPI;
