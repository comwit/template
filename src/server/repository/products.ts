import "server-only";
import { atomic, type AddStatement } from "./atomic";
import {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  isNull,
  like,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { getDb } from "@/server/db";
import {
  categories,
  courses,
  productCourses,
  productFiles,
  products,
} from "@/server/db/schema";
import {
  createPresignedHeadUrl,
  createPresignedUploadUrl,
  deleteObject,
} from "@/server/storage";
import type {
  ListFilter,
  ProductFileInput,
  ProductFilter,
  ProductInput,
} from "@/lib/course";
import { verifyUploadedImage } from "./catalog";
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

export type ProductRow = typeof products.$inferSelect & {
  category: typeof categories.$inferSelect | null;
};
export type BundledCourse = Pick<
  typeof courses.$inferSelect,
  "id" | "title" | "slug" | "thumbnail" | "lessonCount"
>;
const productSelect = { product: products, category: categories } as const;
const shape = (
  rows: { product: typeof products.$inferSelect; category: typeof categories.$inferSelect | null }[],
): ProductRow[] => rows.map((r) => ({ ...r.product, category: r.category }));

export async function findAll(filter: ListFilter, pageable: PageRequest) {
  const db = await getDb();
  const where = and(
    isNull(products.deletedAt),
    filter.status
      ? eq(products.status, filter.status as ProductInput["status"])
      : undefined,
    filter.search
      ? or(
          like(products.title, `%${filter.search}%`),
          like(products.slug, `%${filter.search}%`),
        )
      : undefined,
  );
  const rows = await db
    .select(productSelect)
    .from(products)
    .leftJoin(categories, eq(categories.id, products.categoryId))
    .where(where)
    .orderBy(desc(products.createdAt), desc(products.id))
    .limit(pageable.limit)
    .offset(offset(pageable));
  const [total] = await db.select({ value: count() }).from(products).where(where);
  return paginate(shape(rows), total.value, pageable);
}

export async function findPublic(filter: ProductFilter, pageable: PageRequest) {
  const db = await getDb();
  const where = and(
    isNull(products.deletedAt),
    eq(products.status, "published"),
    filter.category ? eq(categories.slug, filter.category) : undefined,
    filter.kind ? eq(products.kind, filter.kind as ProductInput["kind"]) : undefined,
    filter.search
      ? or(
          like(products.title, `%${filter.search}%`),
          like(products.summary, `%${filter.search}%`),
        )
      : undefined,
  );
  const effectivePrice = sql<number>`CASE WHEN ${products.discountPrice} IS NOT NULL AND (${products.discountEndsAt} IS NULL OR ${products.discountEndsAt} > ${Date.now()}) THEN ${products.discountPrice} ELSE ${products.price} END`;
  const order: Record<ProductFilter["sort"], SQL[]> = {
    latest: [desc(products.publishedAt), desc(products.id)],
    popular: [desc(products.purchaseCount), desc(products.publishedAt)],
    price_asc: [asc(effectivePrice), desc(products.publishedAt)],
    price_desc: [desc(effectivePrice), desc(products.publishedAt)],
  };
  const rows = await db
    .select(productSelect)
    .from(products)
    .leftJoin(categories, eq(categories.id, products.categoryId))
    .where(where)
    .orderBy(...order[filter.sort])
    .limit(pageable.limit)
    .offset(offset(pageable));
  const [total] = await db
    .select({ value: count() })
    .from(products)
    .leftJoin(categories, eq(categories.id, products.categoryId))
    .where(where);
  return paginate(shape(rows), total.value, pageable);
}

export async function findFiles(db: Executor, productId: string) {
  return db
    .select()
    .from(productFiles)
    .where(
      and(
        eq(productFiles.productId, productId),
        eq(productFiles.status, "ready"),
        isNull(productFiles.deletedAt),
      ),
    )
    .orderBy(asc(productFiles.position), asc(productFiles.createdAt));
}
export async function findBundledCourses(
  db: Executor,
  productId: string,
): Promise<BundledCourse[]> {
  const rows = await db
    .select({
      id: courses.id,
      title: courses.title,
      slug: courses.slug,
      thumbnail: courses.thumbnail,
      lessonCount: courses.lessonCount,
    })
    .from(productCourses)
    .innerJoin(courses, eq(courses.id, productCourses.courseId))
    .where(and(eq(productCourses.productId, productId), isNull(courses.deletedAt)))
    .orderBy(asc(productCourses.position));
  return rows;
}

export async function findById(id: string, publicOnly = false) {
  const db = await getDb();
  const [row] = await db
    .select(productSelect)
    .from(products)
    .leftJoin(categories, eq(categories.id, products.categoryId))
    .where(
      and(
        eq(products.id, id),
        isNull(products.deletedAt),
        publicOnly ? eq(products.status, "published") : undefined,
      ),
    );
  ensure(row, "상품을 찾을 수 없습니다.", "NOT_FOUND");
  const [product] = shape([row]);
  const [files, bundled] = await Promise.all([
    findFiles(db, id),
    findBundledCourses(db, id),
  ]);
  return { ...product, files, courses: bundled };
}

/** 상품·파일 순서·묶음 강의를 한 번에 저장한다. 빠진 파일은 소프트 삭제(스토리지 객체는 유지). */
export async function save(input: ProductInput, actorId: string) {
  const db = await getDb();
  return atomic(async (tx, add) => {
    const id = input.id ?? uuid();
    let existing: typeof products.$inferSelect | undefined;
    if (input.id) {
      [existing] = await tx
        .select()
        .from(products)
        .where(and(eq(products.id, id), isNull(products.deletedAt)));
      ensure(existing, "상품을 찾을 수 없습니다.");
    }
    if (input.categoryId) {
      const [category] = await tx
        .select({ id: categories.id })
        .from(categories)
        .where(and(eq(categories.id, input.categoryId), isNull(categories.deletedAt)));
      ensure(category, "유효한 카테고리를 선택해주세요.");
    }
    await verifyUploadedImage(tx, input.thumbnail, "products");
    const [duplicate] = await tx
      .select({ id: products.id })
      .from(products)
      .where(eq(products.slug, input.slug));
    ensure(!duplicate || duplicate.id === id, "이미 사용 중인 상품 주소입니다.");

    // 파일: 완료된 업로드만, 이 상품(또는 아직 상품이 없는 새 업로드)에 속한 것만 연결한다.
    const fileRows = input.fileIds.length
      ? await tx
          .select()
          .from(productFiles)
          .where(
            and(
              inArray(productFiles.id, input.fileIds),
              eq(productFiles.status, "ready"),
              isNull(productFiles.deletedAt),
              eq(productFiles.productId, id),
            ),
          )
      : [];
    ensure(
      fileRows.length === input.fileIds.length,
      "업로드가 완료된 이 상품의 파일만 연결할 수 있습니다.",
    );
    const courseRows = input.courseIds.length
      ? await tx
          .select({ id: courses.id })
          .from(courses)
          .where(and(inArray(courses.id, input.courseIds), isNull(courses.deletedAt)))
      : [];
    ensure(courseRows.length === input.courseIds.length, "유효한 강의만 묶을 수 있습니다.");

    const data = {
      title: input.title,
      slug: input.slug,
      categoryId: input.categoryId,
      summary: input.summary,
      description: input.description,
      thumbnail: input.thumbnail ? JSON.stringify(input.thumbnail) : null,
      kind: input.courseIds.length ? ("bundle" as const) : ("file" as const),
      price: input.price,
      discountPrice: input.discountPrice,
      discountEndsAt: toDate(input.discountEndsAt),
      status: input.status,
      downloadLimit: input.downloadLimit,
      fileCount: input.fileIds.length,
      courseCount: input.courseIds.length,
      publishedAt:
        existing?.publishedAt ??
        (input.status === "published" ? new Date() : null),
      ...updated(),
    };
    if (existing) add(tx.update(products).set(data).where(eq(products.id, id)));
    else add(tx.insert(products).values({ id, ...stamp(), ...data }));

    input.fileIds.forEach((fileId, position) =>
      add(
        tx
          .update(productFiles)
          .set({ position, ...updated() })
          .where(eq(productFiles.id, fileId)),
      ),
    );
    const previousFiles = await tx
      .select({ id: productFiles.id })
      .from(productFiles)
      .where(and(eq(productFiles.productId, id), isNull(productFiles.deletedAt)));
    const removedFiles = previousFiles
      .filter((f) => !input.fileIds.includes(f.id))
      .map((f) => f.id);
    if (removedFiles.length)
      add(
        tx
          .update(productFiles)
          .set({ status: "deleted", deletedAt: new Date(), ...updated() })
          .where(inArray(productFiles.id, removedFiles)),
      );

    const previousCourses = await tx
      .select()
      .from(productCourses)
      .where(eq(productCourses.productId, id));
    const removedCourses = previousCourses
      .filter((c) => !input.courseIds.includes(c.courseId))
      .map((c) => c.id);
    if (removedCourses.length)
      add(tx.delete(productCourses).where(inArray(productCourses.id, removedCourses)));
    input.courseIds.forEach((courseId, position) => {
      const current = previousCourses.find((c) => c.courseId === courseId);
      if (current)
        add(
          tx
            .update(productCourses)
            .set({ position, ...updated() })
            .where(eq(productCourses.id, current.id)),
        );
      else
        add(
          tx.insert(productCourses).values({
            id: uuid(),
            productId: id,
            courseId,
            position,
            ...stamp(),
          }),
        );
    });
    add(audit(tx, actorId, existing ? "product.updated" : "product.created", id));
    return id;
  });
}

export async function archive(id: string, actorId: string) {
  const db = await getDb();
  await atomic(async (tx, add) => {
    const changed = await tx
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.id, id), isNull(products.deletedAt)));
    add(
      tx
        .update(products)
        .set({ status: "archived", ...updated() })
        .where(eq(products.id, id)),
    );
    ensure(changed.length, "상품을 찾을 수 없습니다.");
    add(audit(tx, actorId, "product.archived", id));
  });
}

// ── 파일 업로드(상품 파일은 이미지와 달리 본문을 내려받아 검사하지 않는다) ─────
const allowedFileTypes = new Set([
  "application/pdf",
  "application/zip",
  "application/x-zip-compressed",
  "application/epub+zip",
  "text/plain",
  "text/csv",
  "application/json",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/png",
  "image/jpeg",
  "image/webp",
  "audio/mpeg",
  "video/mp4",
]);
/** 새 상품의 파일은 상품 id 를 먼저 만들어 두고 올린다(편집기가 draft id 를 미리 발급). */
export async function prepareFileUpload(ownerId: string, input: ProductFileInput) {
  ensure(allowedFileTypes.has(input.contentType), "허용되지 않는 파일 형식입니다.");
  const extension = input.name.includes(".")
    ? input.name.split(".").pop()!.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 10) || "bin"
    : "bin";
  const signed = await createPresignedUploadUrl(
    `file.${extension}`,
    input.contentType,
    `files/${input.productId}`,
  );
  const db = await getDb();
  const fileId = uuid();
  await atomic(async (_db, add) => {
    add(
      db.insert(productFiles).values({
        id: fileId,
        productId: input.productId,
        ownerId,
        name: input.name,
        storageKey: signed.key,
        contentType: input.contentType,
        size: input.size,
        ...stamp(),
      }),
    );
  });
  return { fileId, ...signed };
}
export async function completeFileUpload(ownerId: string, fileId: string) {
  const db = await getDb();
  const [file] = await db
    .select()
    .from(productFiles)
    .where(
      and(
        eq(productFiles.id, fileId),
        eq(productFiles.ownerId, ownerId),
        isNull(productFiles.deletedAt),
      ),
    );
  ensure(file && file.status !== "deleted", "업로드 요청을 찾을 수 없습니다.");
  if (file.status === "ready") return file;
  const signed = await createPresignedHeadUrl(file.storageKey);
  const response = await fetch(signed.url, {
    method: signed.method,
    headers: signed.headers,
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  });
  if (!response.ok) {
    await deleteObject(file.storageKey).catch(() => {});
    await atomic(async (_db, add) => {
      add(
        db
          .update(productFiles)
          .set({ status: "deleted", deletedAt: new Date(), ...updated() })
          .where(eq(productFiles.id, fileId)),
      );
    });
    ensure(false, "파일 업로드가 완료되지 않았습니다.");
  }
  const size = Number(response.headers.get("content-length")) || file.size;
  await atomic(async (_db, add) => {
    add(
      db
        .update(productFiles)
        .set({ status: "ready", size, ...updated() })
        .where(eq(productFiles.id, fileId)),
    );
  });
  return { ...file, status: "ready" as const, size };
}
export async function removeFile(ownerId: string, fileId: string, actorId: string) {
  const db = await getDb();
  await atomic(async (tx, add) => {
    const [file] = await tx
      .select()
      .from(productFiles)
      .where(and(eq(productFiles.id, fileId), isNull(productFiles.deletedAt)));
    ensure(file, "파일을 찾을 수 없습니다.");
    add(
      tx
        .update(productFiles)
        .set({ status: "deleted", deletedAt: new Date(), ...updated() })
        .where(eq(productFiles.id, fileId)),
    );
    add(
      tx
        .update(products)
        .set({ fileCount: sql`MAX(${products.fileCount} - 1, 0)`, ...updated() })
        .where(eq(products.id, file.productId)),
    );
    add(audit(tx, actorId, "product.file_removed", file.productId, { fileId, ownerId }));
  });
}
/** 편집기가 새 상품 파일을 올리기 전에 빈 초안을 만든다. */
export async function createDraft(actorId: string) {
  const db = await getDb();
  const id = uuid();
  await atomic(async (tx, add) => {
    add(
      tx.insert(products).values({
        id,
        title: "새 상품",
        slug: `product-${id.slice(-12)}`,
        ...stamp(),
      }),
    );
    add(audit(tx, actorId, "product.created", id));
  });
  return id;
}
export type { AddStatement };
