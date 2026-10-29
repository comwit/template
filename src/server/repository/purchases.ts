import "server-only";
import { atomic, type AddStatement } from "./atomic";
import { and, count, desc, eq, isNull, like, or, sql } from "drizzle-orm";
import { getDb } from "@/server/db";
import {
  appAuthUser,
  downloadLogs,
  productFiles,
  products,
  purchases,
} from "@/server/db/schema";
import { createPresignedDownloadUrl } from "@/server/storage";
import type {
  EnrollmentFilter,
  GrantPurchaseInput,
  RevokePurchaseInput,
} from "@/lib/course";
import { enroll } from "./enrollments";
import { findBundledCourses, findFiles } from "./products";
import {
  audit,
  ensure,
  offset,
  paginate,
  stamp,
  updated,
  type Executor,
} from "./support";
import { uuid } from "./id";
import type { PageRequest } from "./types";

export type PurchaseRow = typeof purchases.$inferSelect & {
  product: Pick<
    typeof products.$inferSelect,
    "id" | "title" | "slug" | "thumbnail" | "kind" | "downloadLimit"
  >;
  user: Pick<typeof appAuthUser.$inferSelect, "id" | "email" | "name">;
};
const purchaseSelect = {
  purchase: purchases,
  product: {
    id: products.id,
    title: products.title,
    slug: products.slug,
    thumbnail: products.thumbnail,
    kind: products.kind,
    downloadLimit: products.downloadLimit,
  },
  user: { id: appAuthUser.id, email: appAuthUser.email, name: appAuthUser.name },
} as const;
const shape = (
  rows: { purchase: typeof purchases.$inferSelect; product: PurchaseRow["product"]; user: PurchaseRow["user"] }[],
): PurchaseRow[] => rows.map((r) => ({ ...r.purchase, product: r.product, user: r.user }));

/**
 * 결제 승인·무료 신청·수동 부여가 모두 이 함수로 구매를 연다. 같은 배치 안에서 호출한다.
 * 묶음 상품이면 포함된 강의의 수강도 함께 연다.
 */
export async function open(
  tx: Executor,
  add: AddStatement,
  input: {
    productId: string;
    userId: string;
    source: "order" | "free" | "manual";
    orderId?: string | null;
    grantedBy?: string | null;
  },
) {
  const [existing] = await tx
    .select()
    .from(purchases)
    .where(
      and(eq(purchases.productId, input.productId), eq(purchases.userId, input.userId)),
    );
  let id = existing?.id;
  if (existing) {
    if (existing.status !== "active")
      add(
        tx
          .update(purchases)
          .set({
            status: "active",
            source: input.source,
            orderId: input.orderId ?? existing.orderId,
            grantedBy: input.grantedBy ?? null,
            revokeReason: null,
            downloadCount: 0,
            ...updated(),
          })
          .where(eq(purchases.id, existing.id)),
      );
  } else {
    id = uuid();
    add(
      tx.insert(purchases).values({
        id,
        productId: input.productId,
        userId: input.userId,
        orderId: input.orderId ?? null,
        source: input.source,
        grantedBy: input.grantedBy ?? null,
        ...stamp(),
      }),
    );
    add(
      tx
        .update(products)
        .set({ purchaseCount: sql`${products.purchaseCount} + 1`, ...updated() })
        .where(eq(products.id, input.productId)),
    );
  }
  for (const course of await findBundledCourses(tx, input.productId))
    await enroll(tx, add, {
      courseId: course.id,
      userId: input.userId,
      source: input.source,
      orderId: input.orderId ?? null,
      grantedBy: input.grantedBy ?? null,
    });
  return id!;
}
export async function revokeByOrder(
  tx: Executor,
  add: AddStatement,
  orderId: string,
  reason: string,
) {
  const rows = await tx
    .select()
    .from(purchases)
    .where(and(eq(purchases.orderId, orderId), eq(purchases.status, "active")));
  for (const row of rows)
    add(
      tx
        .update(purchases)
        .set({ status: "revoked", revokeReason: reason, ...updated() })
        .where(eq(purchases.id, row.id)),
    );
}

export async function findAll(filter: EnrollmentFilter, pageable: PageRequest) {
  const db = await getDb();
  const where = and(
    isNull(purchases.deletedAt),
    filter.courseId ? eq(purchases.productId, filter.courseId) : undefined,
    filter.status
      ? eq(purchases.status, filter.status as PurchaseRow["status"])
      : undefined,
    filter.search
      ? or(
          like(appAuthUser.email, `%${filter.search}%`),
          like(appAuthUser.name, `%${filter.search}%`),
          like(products.title, `%${filter.search}%`),
        )
      : undefined,
  );
  const rows = await db
    .select(purchaseSelect)
    .from(purchases)
    .innerJoin(products, eq(products.id, purchases.productId))
    .innerJoin(appAuthUser, eq(appAuthUser.id, purchases.userId))
    .where(where)
    .orderBy(desc(purchases.createdAt), desc(purchases.id))
    .limit(pageable.limit)
    .offset(offset(pageable));
  const [total] = await db
    .select({ value: count() })
    .from(purchases)
    .innerJoin(products, eq(products.id, purchases.productId))
    .innerJoin(appAuthUser, eq(appAuthUser.id, purchases.userId))
    .where(where);
  return paginate(shape(rows), total.value, pageable);
}
export async function findByUser(userId: string, pageable: PageRequest) {
  const db = await getDb();
  const where = and(
    isNull(purchases.deletedAt),
    eq(purchases.userId, userId),
    eq(purchases.status, "active"),
  );
  const rows = await db
    .select(purchaseSelect)
    .from(purchases)
    .innerJoin(products, eq(products.id, purchases.productId))
    .innerJoin(appAuthUser, eq(appAuthUser.id, purchases.userId))
    .where(where)
    .orderBy(desc(purchases.updatedAt))
    .limit(pageable.limit)
    .offset(offset(pageable));
  const [total] = await db.select({ value: count() }).from(purchases).where(where);
  return paginate(shape(rows), total.value, pageable);
}
/** 구매 목록에 파일·묶음 강의를 붙인다(마이페이지 다운로드 화면용). */
export async function withContents(rows: PurchaseRow[]) {
  const db = await getDb();
  return Promise.all(
    rows.map(async (row) => ({
      ...row,
      files: await findFiles(db, row.productId),
      courses: await findBundledCourses(db, row.productId),
    })),
  );
}
export async function findActive(productId: string, userId: string) {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(purchases)
    .where(
      and(
        eq(purchases.productId, productId),
        eq(purchases.userId, userId),
        eq(purchases.status, "active"),
      ),
    );
  return row ?? null;
}

export async function grant(input: GrantPurchaseInput, actorId: string) {
  const db = await getDb();
  return atomic(async (tx, add) => {
    const [user] = await tx
      .select({ id: appAuthUser.id })
      .from(appAuthUser)
      .where(eq(appAuthUser.email, input.email));
    ensure(user, "해당 이메일로 가입한 회원이 없습니다.");
    const [product] = await tx
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.id, input.productId), isNull(products.deletedAt)));
    ensure(product, "상품을 찾을 수 없습니다.");
    const id = await open(tx, add, {
      productId: input.productId,
      userId: user.id,
      source: "manual",
      grantedBy: actorId,
    });
    add(audit(tx, actorId, "purchase.granted", id, { productId: input.productId }));
    return id;
  });
}
export async function revoke(input: RevokePurchaseInput, actorId: string) {
  const db = await getDb();
  await atomic(async (tx, add) => {
    const [row] = await tx
      .select()
      .from(purchases)
      .where(eq(purchases.id, input.purchaseId));
    ensure(row, "구매 정보를 찾을 수 없습니다.");
    ensure(row.status === "active", "이미 회수된 구매입니다.");
    add(
      tx
        .update(purchases)
        .set({ status: "revoked", revokeReason: input.reason, ...updated() })
        .where(eq(purchases.id, input.purchaseId)),
    );
    add(audit(tx, actorId, "purchase.revoked", input.purchaseId, { reason: input.reason }));
  });
}

/**
 * 구매자에게 짧게 사는 다운로드 주소를 준다. 횟수 제한은 전역 가드 안에서 세고 로그를 남긴다.
 * 파일 본문은 서버를 거치지 않는다(presigned GET). 보호 수준은 "presigned URL + 횟수 제한" 이다:
 * 바인딩된 스토리지가 공개(public)면 URL 경로만으로 영구 접근이 가능하므로, 유출 방지가 필요하면
 * 비공개 스토리지 바인딩이나 서버 프록시 다운로드를 붙여야 한다.
 */
export async function downloadLink(fileId: string, userId: string) {
  const db = await getDb();
  const [file] = await db
    .select()
    .from(productFiles)
    .where(
      and(
        eq(productFiles.id, fileId),
        eq(productFiles.status, "ready"),
        isNull(productFiles.deletedAt),
      ),
    );
  ensure(file, "파일을 찾을 수 없습니다.", "NOT_FOUND");
  const [product] = await db
    .select({ downloadLimit: products.downloadLimit })
    .from(products)
    .where(eq(products.id, file.productId));
  // presign 이 실패하면 횟수를 쓰지 않도록 먼저 발급한다(가드가 던지면 URL 은 돌려주지 않는다).
  const signed = await createPresignedDownloadUrl(file.storageKey);
  const remaining = await atomic(async (tx, add) => {
    const [purchase] = await tx
      .select()
      .from(purchases)
      .where(
        and(
          eq(purchases.productId, file.productId),
          eq(purchases.userId, userId),
          eq(purchases.status, "active"),
        ),
      );
    ensure(purchase, "구매한 상품만 내려받을 수 있습니다.", "NOT_PURCHASED");
    const limit = product?.downloadLimit ?? null;
    ensure(
      limit === null || purchase.downloadCount < limit,
      `다운로드 횟수(${limit}회)를 모두 사용했습니다.`,
      "DOWNLOAD_LIMIT",
    );
    add(
      tx
        .update(purchases)
        .set({
          downloadCount: sql`${purchases.downloadCount} + 1`,
          lastDownloadedAt: new Date(),
          ...updated(),
        })
        .where(eq(purchases.id, purchase.id)),
    );
    add(
      tx.insert(downloadLogs).values({
        id: uuid(),
        purchaseId: purchase.id,
        fileId,
        userId,
        ...stamp(),
      }),
    );
    return limit === null ? null : limit - purchase.downloadCount - 1;
  });
  return { ...signed, fileName: file.name, remaining };
}
