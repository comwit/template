import type { EnrollmentView, PurchaseView } from "@/lib/course";
import { findItem } from "./runtime";
import { nowLabel, statusLabel } from "./labels";
import type { MockData } from "./data";

/** 수강·구매를 여는 주체. 결제·무료 신청·관리자 수동 부여가 같이 쓴다. */
export type Owner = {
  userId: string;
  userEmail: string;
  userName: string;
  source: "order" | "free" | "manual";
  orderId: string | null;
};

export const downloadsLabel = (count: number, limit: number | null) =>
  limit === null ? `${count}회` : `${count}/${limit}회`;

/** 강의 수강을 연다. 이미 수강 중이면 그대로 두고, 회수된 수강은 되살린다. */
export function openEnrollment(
  db: MockData,
  courseId: string,
  owner: Owner,
): EnrollmentView {
  const course = findItem(db.courses, courseId);
  const existing = db.enrollments.find(
    (item) => item.courseId === course.id && item.userId === owner.userId,
  );
  if (existing?.status === "active") return existing;
  const enrollment: EnrollmentView = {
    id: existing?.id ?? crypto.randomUUID(),
    courseId: course.id,
    courseTitle: course.title,
    courseSlug: course.slug,
    thumbnail: course.thumbnail,
    userId: owner.userId,
    userEmail: owner.userEmail,
    userName: owner.userName,
    orderId: owner.orderId,
    source: owner.source,
    sourceLabel: statusLabel(owner.source),
    status: "active",
    statusLabel: statusLabel("active"),
    progressPercent: 0,
    completedLessons: 0,
    lessonCount: course.lessonCount,
    lastLessonId: null,
    startedLabel: nowLabel(),
    completedLabel: null,
    expiresLabel: null,
    certificateId: null,
  };
  if (existing) {
    Object.assign(existing, enrollment);
    return existing;
  }
  db.enrollments.unshift(enrollment);
  course.enrollmentCount += 1;
  const student = db.students.find((item) => item.id === owner.userId);
  if (student) student.enrollmentCount += 1;
  return enrollment;
}

/** 상품 구매를 연다. 묶음이면 포함된 강의 수강도 같이 연다(실제 repository 와 같은 흐름). */
export function openPurchase(
  db: MockData,
  productId: string,
  owner: Owner,
): PurchaseView {
  const product = findItem(db.products, productId);
  const existing = db.purchases.find(
    (item) => item.productId === product.id && item.userId === owner.userId,
  );
  const limit = product.downloadLimit;
  const purchase: PurchaseView = {
    id: existing?.id ?? crypto.randomUUID(),
    productId: product.id,
    productTitle: product.title,
    productSlug: product.slug,
    thumbnail: product.thumbnail,
    kind: product.kind,
    kindLabel: product.kindLabel,
    userId: owner.userId,
    userEmail: owner.userEmail,
    userName: owner.userName,
    orderId: owner.orderId ?? existing?.orderId ?? null,
    source: owner.source,
    sourceLabel: statusLabel(owner.source),
    status: "active",
    statusLabel: "구매 완료",
    downloadCount: 0,
    downloadLimit: limit,
    downloadsLabel: downloadsLabel(0, limit),
    files: product.files.filter((file) => file.status === "ready"),
    courses: product.courses.map((item) => ({ id: item.id, title: item.title })),
    purchasedLabel: nowLabel(),
    lastDownloadedLabel: null,
  };
  let result = purchase;
  if (existing?.status === "active") result = existing;
  else if (existing) {
    Object.assign(existing, purchase);
    result = existing;
  } else {
    db.purchases.unshift(purchase);
    product.purchaseCount += 1;
  }
  for (const course of product.courses) openEnrollment(db, course.id, owner);
  return result;
}
