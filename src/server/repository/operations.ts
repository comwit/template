import "server-only";
import { atomic } from "./atomic";
import { and, count, desc, eq, isNull, like, sql, sum } from "drizzle-orm";
import { getDb } from "@/server/db";
import {
  appAuthUser,
  mediaAssets,
  orders,
  payments,
  products,
  refunds,
  skus,
} from "@/server/db/schema";
import {
  createPresignedDownloadUrl,
  createPresignedUploadUrl,
  deleteObject,
} from "@/server/storage";
import { notificationConfiguration } from "@/server/notifications";
import { config } from "@/server/config";
import { getPaymentConfiguration } from "@/server/payments";
import type { ImageAsset } from "@/lib/image";
import type { ListFilter } from "@/lib/commerce";
import {
  ensure,
  offset,
  paginate,
  shopSettings,
  stamp,
  updated,
} from "./commerce-support";
import { uuid } from "./id";
import type { PageRequest } from "./types";

export async function dashboard() {
  const db = await getDb();
  const [
    productCount,
    orderCount,
    sales,
    lowStock,
    pending,
    refundCount,
    recent,
  ] = await Promise.all([
    db
      .select({ value: count() })
      .from(products)
      .where(isNull(products.deletedAt)),
    db.select({ value: count() }).from(orders).where(isNull(orders.deletedAt)),
    db
      .select({
        gross: sum(payments.amount),
        refunded: sum(payments.refundedAmount),
      })
      .from(payments)
      .where(sql`${payments.approvedAt} IS NOT NULL`),
    db
      .select({ value: count() })
      .from(skus)
      .where(
        and(
          isNull(skus.deletedAt),
          eq(skus.active, true),
          sql`${skus.onHand} - ${skus.reserved} <= 5`,
        ),
      ),
    db
      .select({ value: count() })
      .from(orders)
      .where(eq(orders.paymentStatus, "review")),
    db
      .select({ value: count() })
      .from(refunds)
      .where(eq(refunds.status, "unknown")),
    db
      .select()
      .from(orders)
      .where(isNull(orders.deletedAt))
      .orderBy(desc(orders.createdAt))
      .limit(5),
  ]);
  return {
    products: productCount[0].value,
    orders: orderCount[0].value,
    gross: Number(sales[0].gross ?? 0),
    refunded: Number(sales[0].refunded ?? 0),
    lowStock: lowStock[0].value,
    needsReview: pending[0].value + refundCount[0].value,
    recent,
  };
}
export async function findCustomers(filter: ListFilter, pageable: PageRequest) {
  const db = await getDb();
  const where = filter.search
    ? like(appAuthUser.email, `%${filter.search}%`)
    : undefined;
  const rows = await db
    .select({
      id: appAuthUser.id,
      name: appAuthUser.name,
      email: appAuthUser.email,
      emailVerified: appAuthUser.emailVerified,
      createdAt: appAuthUser.createdAt,
    })
    .from(appAuthUser)
    .where(where)
    .orderBy(desc(appAuthUser.createdAt))
    .limit(pageable.limit)
    .offset(offset(pageable));
  const [total] = await db
    .select({ value: count() })
    .from(appAuthUser)
    .where(where);
  return paginate(rows, total.value, pageable);
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
    ...shopSettings(),
    paymentReady,
    notificationReady: notificationConfiguration().ready,
    notificationChannel: notificationConfiguration().channel,
    databaseReady: Boolean(config.DATABASE_URL),
    storageReady: Boolean(config.COMWIT_STORAGE_PUBLIC_BASE_URL),
    appUrl: config.APP_URL ?? null,
  };
}
export async function prepareUpload(ownerId: string, contentType: string) {
  const types: Record<string, string> = {
    "image/webp": "webp",
    "image/jpeg": "jpg",
    "image/png": "png",
  };
  ensure(types[contentType], "WebP, JPG, PNG 이미지만 업로드할 수 있습니다.");
  const signed = await createPresignedUploadUrl(
    `product.${types[contentType]}`,
    contentType,
    "products",
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
 * 상품 저장은 제출한 ImageAsset 과 여기 기록한 JSON 이 문자열로 같아야 통과하므로, 썸네일은 반드시 이 단계에서 묶는다.
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
  ensure(
    asset && asset.status !== "deleted",
    "업로드 요청을 찾을 수 없습니다.",
  );
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
