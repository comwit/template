import "server-only";
import { atomic, type AddStatement } from "./atomic";
import { and, asc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/server/db";
import { cartItems, carts, products, skus } from "@/server/db/schema";
import { ensure, shopSettings, stamp, updated } from "./commerce-support";
import { uuid } from "./id";

export async function find(customerId: string) {
  const db = await getDb();
  const [cart] = await db
    .select()
    .from(carts)
    .where(eq(carts.customerId, customerId));
  const items = cart
    ? await db
        .select({ item: cartItems, sku: skus, product: products })
        .from(cartItems)
        .innerJoin(skus, eq(skus.id, cartItems.skuId))
        .innerJoin(products, eq(products.id, skus.productId))
        .where(and(eq(cartItems.cartId, cart.id), isNull(cartItems.deletedAt)))
        .orderBy(asc(cartItems.createdAt))
    : [];
  const settings = shopSettings();
  const subtotal = items.reduce(
    (sum, r) => sum + r.sku.price * r.item.quantity,
    0,
  );
  const shippingFee =
    items.length && subtotal < settings.freeShippingThreshold
      ? settings.shippingFee
      : 0;
  return { items, subtotal, shippingFee, total: subtotal + shippingFee };
}
export async function setQuantity(
  customerId: string,
  skuId: string,
  quantity: number,
) {
  ensure(
    Number.isInteger(quantity) && quantity >= 0 && quantity <= 99,
    "수량을 확인해주세요.",
  );
  const db = await getDb();
  await atomic(async (tx, add) => {
    const [existingCart] = await tx
      .select()
      .from(carts)
      .where(eq(carts.customerId, customerId));
    const cart = existingCart ?? { id: uuid(), customerId, ...stamp() };
    if (!existingCart) add(tx.insert(carts).values(cart));
    if (!quantity) {
      add(
        tx
          .update(cartItems)
          .set({ deletedAt: new Date(), ...updated() })
          .where(
            and(eq(cartItems.cartId, cart.id), eq(cartItems.skuId, skuId)),
          ),
      );
      return;
    }
    const [row] = await tx
      .select({ sku: skus, product: products })
      .from(skus)
      .innerJoin(products, eq(products.id, skus.productId))
      .where(
        and(
          eq(skus.id, skuId),
          isNull(skus.deletedAt),
          eq(skus.active, true),
          eq(products.status, "active"),
          isNull(products.deletedAt),
        ),
      );
    ensure(
      row && row.sku.onHand - row.sku.reserved >= quantity,
      "구매 가능한 상품과 재고를 확인해주세요.",
    );
    const [total] = await tx
      .select({ id: cartItems.id })
      .from(cartItems)
      .where(and(eq(cartItems.cartId, cart.id), eq(cartItems.skuId, skuId)));
    if (total)
      add(
        tx
          .update(cartItems)
          .set({ quantity, deletedAt: null, ...updated() })
          .where(eq(cartItems.id, total.id)),
      );
    else {
      const entries = await tx
        .select({ id: cartItems.id })
        .from(cartItems)
        .where(and(eq(cartItems.cartId, cart.id), isNull(cartItems.deletedAt)))
        .limit(50);
      ensure(
        entries.length < 50,
        "장바구니에는 최대 50개 SKU를 담을 수 있습니다.",
      );
      add(
        tx
          .insert(cartItems)
          .values({ id: uuid(), cartId: cart.id, skuId, quantity, ...stamp() }),
      );
    }
  });
}
