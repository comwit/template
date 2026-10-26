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
} from "drizzle-orm";
import { config } from "@/server/config";
import { getDb } from "@/server/db";
import {
  categories,
  inventoryMovements,
  orderItems,
  mediaAssets,
  products,
  skus,
} from "@/server/db/schema";
import {
  optionKey,
  type CategoryInput,
  type ListFilter,
  type ProductInput,
  type StockInput,
} from "@/lib/commerce";
import {
  audit,
  ensure,
  offset,
  paginate,
  stamp,
  updated,
} from "./commerce-support";
import { uuid } from "./id";
import type { PageRequest } from "./types";

export async function findAll(
  filter: ListFilter,
  pageable: PageRequest,
  publicOnly = false,
) {
  const db = await getDb();
  const where = and(
    isNull(products.deletedAt),
    publicOnly
      ? eq(products.status, "active")
      : filter.status
        ? eq(products.status, filter.status as ProductInput["status"])
        : undefined,
    filter.search
      ? or(
          like(products.name, `%${filter.search}%`),
          like(products.slug, `%${filter.search}%`),
        )
      : undefined,
  );
  const rows = await db
    .select()
    .from(products)
    .where(where)
    .orderBy(desc(products.createdAt), desc(products.id))
    .limit(pageable.limit)
    .offset(offset(pageable));
  const [total] = await db
    .select({ value: count() })
    .from(products)
    .where(where);
  const variants = rows.length
    ? await db
        .select()
        .from(skus)
        .where(
          and(
            inArray(
              skus.productId,
              rows.map((r) => r.id),
            ),
            isNull(skus.deletedAt),
            publicOnly ? eq(skus.active, true) : undefined,
          ),
        )
        .orderBy(asc(skus.price), asc(skus.code))
    : [];
  return paginate(
    rows.map((p) => ({
      ...p,
      skus: variants.filter((s) => s.productId === p.id),
    })),
    total.value,
    pageable,
  );
}
export async function findById(id: string, publicOnly = false) {
  const db = await getDb();
  const [product] = await db
    .select()
    .from(products)
    .where(
      and(
        eq(products.id, id),
        isNull(products.deletedAt),
        publicOnly ? eq(products.status, "active") : undefined,
      ),
    );
  ensure(product, "상품을 찾을 수 없습니다.", "NOT_FOUND");
  const variants = await db
    .select()
    .from(skus)
    .where(
      and(
        eq(skus.productId, id),
        isNull(skus.deletedAt),
        publicOnly ? eq(skus.active, true) : undefined,
      ),
    )
    .orderBy(asc(skus.price), asc(skus.code));
  return { ...product, skus: variants };
}
export async function save(input: ProductInput, actorId: string) {
  const db = await getDb();
  return atomic(async (tx, add) => {
    const id = input.id ?? uuid();
    if (input.id) {
      const [existing] = await tx
        .select()
        .from(products)
        .where(and(eq(products.id, id), isNull(products.deletedAt)));
      ensure(existing, "상품을 찾을 수 없습니다.");
    }
    if (input.categoryId) {
      const [category] = await tx
        .select()
        .from(categories)
        .where(
          and(
            eq(categories.id, input.categoryId),
            isNull(categories.deletedAt),
          ),
        );
      ensure(category, "유효한 카테고리를 선택해주세요.");
    }
    for (const image of input.images) {
      const base = config.COMWIT_STORAGE_PUBLIC_BASE_URL?.replace(/\/$/, "");
      ensure(
        base && image.url.startsWith(`${base}/products/`),
        "업로드한 상품 이미지만 사용할 수 있습니다.",
      );
      const key = decodeURIComponent(image.url.slice(base.length + 1));
      const [asset] = await tx
        .select()
        .from(mediaAssets)
        .where(
          and(
            eq(mediaAssets.storageKey, key),
            eq(mediaAssets.status, "ready"),
            isNull(mediaAssets.deletedAt),
          ),
        );
      ensure(
        asset?.image === JSON.stringify(image),
        "검증이 완료된 이미지를 선택해주세요.",
      );
    }
    const data = {
      name: input.name,
      slug: input.slug,
      description: input.description,
      categoryId: input.categoryId,
      status: input.status,
      images: JSON.stringify(input.images),
      ...updated(),
    };
    const [duplicate] = await tx
      .select({ id: products.id })
      .from(products)
      .where(eq(products.slug, input.slug));
    ensure(
      !duplicate || duplicate.id === id,
      "이미 사용 중인 상품 주소입니다.",
    );
    if (input.id) add(tx.update(products).set(data).where(eq(products.id, id)));
    else add(tx.insert(products).values({ id, ...stamp(), ...data }));
    const previous = await tx.select().from(skus).where(eq(skus.productId, id));
    const matchingCodes = await tx
      .select({ id: skus.id, code: skus.code })
      .from(skus)
      .where(
        inArray(
          skus.code,
          input.skus.map((item) => item.code),
        ),
      );
    for (const item of input.skus) {
      const variantId = item.id ?? uuid();
      if (item.id)
        ensure(
          previous.some((s) => s.id === item.id && !s.deletedAt),
          "해당 상품의 SKU만 수정할 수 있습니다.",
        );
      const duplicateSku = matchingCodes.find((sku) => sku.code === item.code);
      ensure(
        !duplicateSku || duplicateSku.id === variantId,
        "이미 사용 중인 SKU 코드입니다.",
      );
      const duplicateOptions = previous.find(
        (sku) => sku.optionKey === optionKey(item.options),
      );
      ensure(
        !duplicateOptions || duplicateOptions.id === variantId,
        "이미 사용된 옵션 조합입니다. 기존 SKU를 수정해주세요.",
      );
      const data = {
        productId: id,
        code: item.code,
        optionKey: optionKey(item.options),
        options: JSON.stringify(item.options),
        price: item.price,
        active: item.active,
        ...updated(),
      };
      if (item.id) add(tx.update(skus).set(data).where(eq(skus.id, variantId)));
      else add(tx.insert(skus).values({ id: variantId, ...stamp(), ...data }));
    }
    for (const old of previous)
      if (!old.deletedAt && !input.skus.some((s) => s.id === old.id)) {
        ensure(
          old.reserved === 0,
          "주문에서 예약 중인 SKU는 제거할 수 없습니다.",
        );
        ensure(
          old.onHand === 0,
          "재고가 남은 SKU는 제거 대신 판매를 중지해주세요.",
        );
        const history = await tx
          .select({ id: orderItems.id })
          .from(orderItems)
          .where(eq(orderItems.skuId, old.id))
          .limit(1);
        ensure(
          !history.length,
          "주문 이력이 있는 SKU는 제거 대신 판매를 중지해주세요.",
        );
        add(
          tx
            .update(skus)
            .set({ deletedAt: new Date(), active: false, ...updated() })
            .where(eq(skus.id, old.id)),
        );
      }
    add(
      audit(tx, actorId, input.id ? "product.updated" : "product.created", id),
    );
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
export async function findCategories() {
  const db = await getDb();
  return db
    .select()
    .from(categories)
    .where(isNull(categories.deletedAt))
    .orderBy(asc(categories.name));
}
export async function saveCategory(input: CategoryInput, actorId: string) {
  const db = await getDb();
  return atomic(async (tx, add) => {
    const id = input.id ?? uuid();
    const [duplicate] = await tx
      .select()
      .from(categories)
      .where(eq(categories.slug, input.slug));
    ensure(
      !duplicate || duplicate.id === id,
      "이미 사용 중인 카테고리 주소입니다.",
    );
    if (input.id) {
      const rows = await tx
        .select()
        .from(categories)
        .where(and(eq(categories.id, id), isNull(categories.deletedAt)));
      add(
        tx
          .update(categories)
          .set({ name: input.name, slug: input.slug, ...updated() })
          .where(eq(categories.id, id)),
      );
      ensure(rows.length, "카테고리를 찾을 수 없습니다.");
    } else
      add(
        tx
          .insert(categories)
          .values({ id, name: input.name, slug: input.slug, ...stamp() }),
      );
    add(audit(tx, actorId, "category.saved", id));
    return id;
  });
}
export async function findInventory(filter: ListFilter, pageable: PageRequest) {
  const db = await getDb();
  const where = and(
    isNull(skus.deletedAt),
    filter.search
      ? or(
          like(skus.code, `%${filter.search}%`),
          like(products.name, `%${filter.search}%`),
        )
      : undefined,
    filter.status === "low"
      ? sql`${skus.onHand} - ${skus.reserved} <= 5`
      : undefined,
  );
  const rows = await db
    .select({ sku: skus, productName: products.name })
    .from(skus)
    .innerJoin(products, eq(products.id, skus.productId))
    .where(where)
    .orderBy(asc(skus.code))
    .limit(pageable.limit)
    .offset(offset(pageable));
  const [total] = await db
    .select({ value: count() })
    .from(skus)
    .innerJoin(products, eq(products.id, skus.productId))
    .where(where);
  return paginate(rows, total.value, pageable);
}
export async function adjustStock(input: StockInput, actorId: string) {
  const db = await getDb();
  await atomic(async (tx, add) => {
    const [old] = await tx
      .select()
      .from(inventoryMovements)
      .where(eq(inventoryMovements.requestKey, input.requestKey));
    if (old) {
      ensure(
        old.skuId === input.skuId &&
          old.quantity === input.quantity &&
          old.reason === input.reason &&
          old.actorId === actorId,
        "다른 요청에 사용된 요청키입니다.",
      );
      return;
    }
    const rows = await tx
      .select()
      .from(skus)
      .where(
        and(
          eq(skus.id, input.skuId),
          isNull(skus.deletedAt),
          sql`${skus.onHand} + ${input.quantity} >= ${skus.reserved}`,
        ),
      );
    add(
      tx
        .update(skus)
        .set({ onHand: sql`${skus.onHand} + ${input.quantity}`, ...updated() })
        .where(eq(skus.id, input.skuId)),
    );
    ensure(
      rows.length,
      "예약 재고보다 실재고를 줄일 수 없습니다. SKU를 확인해주세요.",
    );
    add(
      tx.insert(inventoryMovements).values({
        id: uuid(),
        skuId: input.skuId,
        quantity: input.quantity,
        kind: "adjustment",
        reason: input.reason,
        actorId,
        requestKey: input.requestKey,
        ...stamp(),
      }),
    );
    add(
      audit(tx, actorId, "inventory.adjusted", input.skuId, {
        quantity: input.quantity,
        reason: input.reason,
      }),
    );
  });
}
export async function findMovements(skuId: string, pageable: PageRequest) {
  const db = await getDb();
  const where = eq(inventoryMovements.skuId, skuId);
  const rows = await db
    .select()
    .from(inventoryMovements)
    .where(where)
    .orderBy(desc(inventoryMovements.createdAt))
    .limit(pageable.limit)
    .offset(offset(pageable));
  const [total] = await db
    .select({ value: count() })
    .from(inventoryMovements)
    .where(where);
  return paginate(rows, total.value, pageable);
}
