import "server-only";
import { atomic } from "./atomic";
import { and, count, desc, eq, isNull, like, or, sql, sum } from "drizzle-orm";
import { getDb } from "@/server/db";
import {
  appAuthUser,
  courses,
  enrollments,
  mediaAssets,
  orders,
  payments,
  questions,
  refundRequests,
  refunds,
} from "@/server/db/schema";
import {
  createPresignedDownloadUrl,
  createPresignedUploadUrl,
  deleteObject,
} from "@/server/storage";
import { config } from "@/server/config";
import { getPaymentConfiguration } from "@/server/payments";
import type { ImageAsset } from "@/lib/image";
import type { ListFilter } from "@/lib/course";
import { ensure, offset, paginate, platformSettings, stamp, updated } from "./support";
import { uuid } from "./id";
import type { PageRequest } from "./types";

export async function dashboard() {
  const db = await getDb();
  const monthStart = (back: number) => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    d.setMonth(d.getMonth() - back);
    return d;
  };
  const sixMonthsAgo = monthStart(5).getTime();
  const [
    courseCount,
    studentCount,
    enrollmentCounts,
    sales,
    reviewPending,
    refundUnknown,
    pendingRefunds,
    openQuestions,
    completion,
    recent,
    monthlySales,
    monthlyEnrollments,
    topCourses,
  ] = await Promise.all([
    db
      .select({ value: count() })
      .from(courses)
      .where(and(isNull(courses.deletedAt), eq(courses.status, "published"))),
    db.select({ value: count() }).from(appAuthUser),
    db
      .select({ status: enrollments.status, value: count() })
      .from(enrollments)
      .where(isNull(enrollments.deletedAt))
      .groupBy(enrollments.status),
    db
      .select({
        gross: sum(payments.amount),
        refunded: sum(payments.refundedAmount),
      })
      .from(payments)
      .where(sql`${payments.approvedAt} IS NOT NULL`),
    db
      .select({ value: count() })
      .from(orders)
      .where(eq(orders.paymentStatus, "review")),
    db
      .select({ value: count() })
      .from(refunds)
      .where(eq(refunds.status, "unknown")),
    db
      .select({ value: count() })
      .from(refundRequests)
      .where(eq(refundRequests.status, "pending")),
    db
      .select({ value: count() })
      .from(questions)
      .where(and(isNull(questions.deletedAt), eq(questions.status, "open"))),
    db
      .select({
        total: count(),
        completed: sum(sql`CASE WHEN ${enrollments.completedAt} IS NOT NULL THEN 1 ELSE 0 END`),
      })
      .from(enrollments)
      .where(eq(enrollments.status, "active")),
    db
      .select()
      .from(orders)
      .where(isNull(orders.deletedAt))
      .orderBy(desc(orders.createdAt))
      .limit(5),
    db
      .select({
        month: sql<string>`strftime('%Y-%m', ${payments.approvedAt} / 1000, 'unixepoch', '+9 hours')`,
        sales: sum(sql`${payments.amount} - ${payments.refundedAmount}`),
      })
      .from(payments)
      .where(sql`${payments.approvedAt} >= ${sixMonthsAgo}`)
      .groupBy(sql`1`),
    db
      .select({
        month: sql<string>`strftime('%Y-%m', ${enrollments.createdAt} / 1000, 'unixepoch', '+9 hours')`,
        value: count(),
      })
      .from(enrollments)
      .where(sql`${enrollments.createdAt} >= ${sixMonthsAgo}`)
      .groupBy(sql`1`),
    db
      .select({
        id: courses.id,
        title: courses.title,
        enrollments: count(enrollments.id),
        completed: sum(sql`CASE WHEN ${enrollments.completedAt} IS NOT NULL THEN 1 ELSE 0 END`),
      })
      .from(courses)
      .leftJoin(
        enrollments,
        and(eq(enrollments.courseId, courses.id), eq(enrollments.status, "active")),
      )
      .where(isNull(courses.deletedAt))
      .groupBy(courses.id)
      .orderBy(desc(count(enrollments.id)))
      .limit(5),
  ]);
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = monthStart(5 - i);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const enrollmentTotal = enrollmentCounts.reduce((s, r) => s + r.value, 0);
  return {
    courses: courseCount[0].value,
    students: studentCount[0].value,
    enrollments: enrollmentTotal,
    activeEnrollments:
      enrollmentCounts.find((r) => r.status === "active")?.value ?? 0,
    gross: Number(sales[0].gross ?? 0),
    refunded: Number(sales[0].refunded ?? 0),
    needsReview: reviewPending[0].value + refundUnknown[0].value,
    pendingRefunds: pendingRefunds[0].value,
    openQuestions: openQuestions[0].value,
    completionRate: completion[0].total
      ? Math.round((Number(completion[0].completed ?? 0) / completion[0].total) * 100)
      : 0,
    recent,
    monthly: months.map((month) => ({
      month,
      sales: Number(monthlySales.find((r) => r.month === month)?.sales ?? 0),
      enrollments: monthlyEnrollments.find((r) => r.month === month)?.value ?? 0,
    })),
    topCourses: topCourses.map((c) => ({
      id: c.id,
      title: c.title,
      enrollments: c.enrollments,
      completionRate: c.enrollments
        ? Math.round((Number(c.completed ?? 0) / c.enrollments) * 100)
        : 0,
    })),
  };
}

export async function findStudents(filter: ListFilter, pageable: PageRequest) {
  const db = await getDb();
  const where = filter.search
    ? or(
        like(appAuthUser.email, `%${filter.search}%`),
        like(appAuthUser.name, `%${filter.search}%`),
      )
    : undefined;
  const rows = await db
    .select({
      id: appAuthUser.id,
      name: appAuthUser.name,
      email: appAuthUser.email,
      emailVerified: appAuthUser.emailVerified,
      createdAt: appAuthUser.createdAt,
      enrollmentCount: count(enrollments.id),
      completedCount: sum(
        sql`CASE WHEN ${enrollments.completedAt} IS NOT NULL THEN 1 ELSE 0 END`,
      ),
    })
    .from(appAuthUser)
    .leftJoin(
      enrollments,
      and(eq(enrollments.userId, appAuthUser.id), eq(enrollments.status, "active")),
    )
    .where(where)
    .groupBy(appAuthUser.id)
    .orderBy(desc(appAuthUser.createdAt))
    .limit(pageable.limit)
    .offset(offset(pageable));
  const [total] = await db
    .select({ value: count() })
    .from(appAuthUser)
    .where(where);
  return paginate(
    rows.map((r) => ({ ...r, completedCount: Number(r.completedCount ?? 0) })),
    total.value,
    pageable,
  );
}

export function settings() {
  let paymentReady = false;
  try {
    getPaymentConfiguration();
    paymentReady = true;
  } catch {
    /* Expose readiness only, never credentials. */
  }
  return {
    ...platformSettings(),
    paymentReady,
    databaseReady: Boolean(config.DATABASE_URL),
    storageReady: Boolean(config.COMWIT_STORAGE_PUBLIC_BASE_URL),
    appUrl: config.APP_URL ?? null,
  };
}

export type UploadFolder = "courses" | "products" | "instructors" | "banners" | "content";
export async function prepareUpload(
  ownerId: string,
  contentType: string,
  folder: UploadFolder,
) {
  const types: Record<string, string> = {
    "image/webp": "webp",
    "image/jpeg": "jpg",
    "image/png": "png",
  };
  ensure(types[contentType], "WebP, JPG, PNG 이미지만 업로드할 수 있습니다.");
  const signed = await createPresignedUploadUrl(
    `image.${types[contentType]}`,
    contentType,
    folder,
  );
  ensure(signed.publicUrl, "공개 이미지 스토리지를 확인해주세요.");
  const db = await getDb();
  const id = uuid();
  await atomic(async (_db, add) => {
    add(
      db
        .insert(mediaAssets)
        .values({ id, ownerId, storageKey: signed.key, ...stamp() }),
    );
  });
  return { id, ...signed };
}
/**
 * 업로드 완료. `thumbId` 는 같은 주인이 먼저 완료한 썸네일 업로드의 id — 그 공개 URL 을 `thumb` 로 묶어 저장한다.
 * 이미지 저장 검증은 제출한 ImageAsset 과 여기 기록한 JSON 이 문자열로 같아야 통과하므로, 썸네일은 반드시 이 단계에서 묶는다.
 */
export async function completeUpload(
  ownerId: string,
  id: string,
  width: number,
  height: number,
  thumbId?: string,
): Promise<ImageAsset> {
  const db = await getDb();
  const [asset] = await db
    .select()
    .from(mediaAssets)
    .where(
      and(
        eq(mediaAssets.id, id),
        eq(mediaAssets.ownerId, ownerId),
        isNull(mediaAssets.deletedAt),
      ),
    );
  ensure(asset && asset.status !== "deleted", "업로드 요청을 찾을 수 없습니다.");
  if (asset.status === "ready" && asset.image)
    return JSON.parse(asset.image) as ImageAsset;
  ensure(
    Number.isInteger(width) &&
      Number.isInteger(height) &&
      width > 0 &&
      height > 0 &&
      width <= 10000 &&
      height <= 10000,
    "이미지 크기를 확인해주세요.",
  );
  const signed = await createPresignedDownloadUrl(asset.storageKey);
  const response = await fetch(signed.url, {
    method: signed.method,
    headers: signed.headers,
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  });
  ensure(response.ok && response.body, "이미지 업로드가 완료되지 않았습니다.");
  const reader = response.body.getReader();
  let size = 0;
  const prefix: number[] = [];
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      size += result.value.length;
      ensure(size <= 3 * 1024 * 1024, "이미지는 3MB 이하로 업로드해주세요.");
      if (prefix.length < 16)
        prefix.push(...result.value.slice(0, 16 - prefix.length));
    }
    const bytes = new Uint8Array(prefix);
    // 바이너리 헤더는 1바이트=1글자로 읽는다(UTF-8 로 읽으면 RIFF 크기 바이트가 합쳐져 위치가 밀려 정상 webp 를 거절한다).
    const ascii = String.fromCharCode(...bytes);
    const valid =
      (asset.storageKey.endsWith(".webp") &&
        ascii.startsWith("RIFF") &&
        ascii.slice(8, 12) === "WEBP") ||
      (asset.storageKey.endsWith(".png") &&
        bytes[0] === 137 &&
        ascii.slice(1, 4) === "PNG") ||
      (asset.storageKey.endsWith(".jpg") &&
        bytes[0] === 255 &&
        bytes[1] === 216 &&
        bytes[2] === 255);
    ensure(valid && size > 16, "유효한 이미지 파일이 아닙니다.");
  } catch (error) {
    await reader.cancel();
    await deleteObject(asset.storageKey);
    await atomic(async (_db, add) => {
      add(
        db
          .update(mediaAssets)
          .set({ status: "deleted", deletedAt: new Date(), ...updated() })
          .where(eq(mediaAssets.id, id)),
      );
    });
    throw error;
  }
  const base = config.COMWIT_STORAGE_PUBLIC_BASE_URL?.replace(/\/$/, "");
  ensure(base, "스토리지 설정을 확인해주세요.");
  let thumb: string | undefined;
  if (thumbId) {
    const [thumbAsset] = await db
      .select()
      .from(mediaAssets)
      .where(
        and(
          eq(mediaAssets.id, thumbId),
          eq(mediaAssets.ownerId, ownerId),
          eq(mediaAssets.status, "ready"),
          isNull(mediaAssets.deletedAt),
        ),
      );
    ensure(thumbAsset?.image, "썸네일 업로드를 먼저 완료해주세요.");
    thumb = (JSON.parse(thumbAsset.image) as ImageAsset).url;
  }
  const image: ImageAsset = {
    url: `${base}/${asset.storageKey.split("/").map(encodeURIComponent).join("/")}`,
    width,
    height,
    ...(thumb ? { thumb } : {}),
  };
  await atomic(async (_db, add) => {
    add(
      db
        .update(mediaAssets)
        .set({ status: "ready", image: JSON.stringify(image), ...updated() })
        .where(eq(mediaAssets.id, id)),
    );
  });
  return image;
}
