import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { id, timestamps } from "./shared-schema";
import { appAuthUser } from "../plugin/auth/app-schema";
import { categories, courses } from "./catalog-schema";

// ── 디지털 상품 ──────────────────────────────────────────────────
/**
 * 파일을 주는 상품(전자책 PDF·자료·템플릿)과 강의+파일 묶음.
 * 주문·결제·쿠폰은 강의와 같은 테이블을 쓰고(`orders.itemType = "product"`), 결제 승인 시 `purchases` 가 열린다.
 */
export const products = sqliteTable(
  "products",
  {
    id: id(),
    categoryId: text("category_id").references(() => categories.id),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    summary: text("summary").notNull().default(""),
    /** TipTap HTML */
    description: text("description").notNull().default(""),
    thumbnail: text("thumbnail"),
    /** file: 파일만 / bundle: 강의 포함 */
    kind: text("kind", { enum: ["file", "bundle"] }).notNull().default("file"),
    price: integer("price").notNull().default(0),
    discountPrice: integer("discount_price"),
    discountEndsAt: integer("discount_ends_at", { mode: "timestamp_ms" }),
    status: text("status", { enum: ["draft", "published", "archived"] })
      .notNull()
      .default("draft"),
    /** 구매 1건당 파일 다운로드 허용 횟수. null 이면 무제한 */
    downloadLimit: integer("download_limit"),
    fileCount: integer("file_count").notNull().default(0),
    courseCount: integer("course_count").notNull().default(0),
    purchaseCount: integer("purchase_count").notNull().default(0),
    publishedAt: integer("published_at", { mode: "timestamp_ms" }),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("products_slug_uq").on(t.slug),
    index("products_list_idx").on(t.deletedAt, t.status, t.publishedAt),
    index("products_category_idx").on(t.categoryId, t.deletedAt),
    index("products_title_idx").on(t.title),
    check("products_price_check", sql`${t.price} >= 0`),
    check(
      "products_discount_check",
      sql`${t.discountPrice} IS NULL OR (${t.discountPrice} >= 0 AND ${t.discountPrice} < ${t.price})`,
    ),
    check(
      "products_download_limit_check",
      sql`${t.downloadLimit} IS NULL OR ${t.downloadLimit} > 0`,
    ),
  ],
);

/** 상품에 딸린 파일. 스토리지 키만 저장하고 구매자에게는 짧게 사는 presigned GET 을 발급한다. */
export const productFiles = sqliteTable(
  "product_files",
  {
    id: id(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id),
    ownerId: text("owner_id").notNull(),
    name: text("name").notNull(),
    storageKey: text("storage_key").notNull(),
    contentType: text("content_type").notNull(),
    size: integer("size").notNull().default(0),
    position: integer("position").notNull().default(0),
    status: text("status", { enum: ["pending", "ready", "deleted"] })
      .notNull()
      .default("pending"),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("product_files_key_uq").on(t.storageKey),
    index("product_files_product_idx").on(t.productId, t.deletedAt, t.position),
    check("product_files_size_check", sql`${t.size} >= 0`),
  ],
);

/** 묶음 상품에 포함되는 강의. 결제 승인 시 각 강의의 수강이 함께 열린다. */
export const productCourses = sqliteTable(
  "product_courses",
  {
    id: id(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id),
    position: integer("position").notNull().default(0),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("product_courses_uq").on(t.productId, t.courseId),
    index("product_courses_course_idx").on(t.courseId),
  ],
);

/** 구매 권한. 수강(enrollments)의 상품판. 환불되면 회수된다. */
export const purchases = sqliteTable(
  "purchases",
  {
    id: id(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id),
    userId: text("user_id")
      .notNull()
      .references(() => appAuthUser.id),
    orderId: text("order_id"),
    source: text("source", { enum: ["order", "free", "manual"] }).notNull(),
    status: text("status", { enum: ["active", "revoked"] })
      .notNull()
      .default("active"),
    downloadCount: integer("download_count").notNull().default(0),
    lastDownloadedAt: integer("last_downloaded_at", { mode: "timestamp_ms" }),
    grantedBy: text("granted_by"),
    revokeReason: text("revoke_reason"),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("purchases_product_user_uq").on(t.productId, t.userId),
    index("purchases_user_idx").on(t.userId, t.status, t.updatedAt),
    index("purchases_product_idx").on(t.productId, t.status, t.createdAt),
    index("purchases_order_idx").on(t.orderId),
    check("purchases_download_check", sql`${t.downloadCount} >= 0`),
  ],
);

/** 누가 어떤 파일을 언제 받았는지. 다운로드 한도 계산과 운영 확인용. */
export const downloadLogs = sqliteTable(
  "download_logs",
  {
    id: id(),
    purchaseId: text("purchase_id")
      .notNull()
      .references(() => purchases.id),
    fileId: text("file_id")
      .notNull()
      .references(() => productFiles.id),
    userId: text("user_id").notNull(),
    ...timestamps(),
  },
  (t) => [
    index("download_logs_purchase_idx").on(t.purchaseId, t.createdAt),
    index("download_logs_user_idx").on(t.userId, t.createdAt),
  ],
);

// ── 리드(무료 신청 연락처) ────────────────────────────────────────
/** 무료 강의·무료 자료를 신청할 때 받는 연락처. 관리자 리드 화면에서 조회·내보내기 한다. */
export const leads = sqliteTable(
  "leads",
  {
    id: id(),
    userId: text("user_id").references(() => appAuthUser.id),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone").notNull().default(""),
    source: text("source", { enum: ["free_course", "free_product"] }).notNull(),
    courseId: text("course_id").references(() => courses.id),
    productId: text("product_id").references(() => products.id),
    orderId: text("order_id"),
    itemTitle: text("item_title").notNull(),
    /** 마케팅 수신 동의 */
    consent: integer("consent", { mode: "boolean" }).notNull().default(false),
    note: text("note").notNull().default(""),
    ...timestamps(),
  },
  (t) => [
    index("leads_list_idx").on(t.deletedAt, t.createdAt),
    index("leads_email_idx").on(t.email),
    index("leads_source_idx").on(t.source, t.createdAt),
  ],
);
