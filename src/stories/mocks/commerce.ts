import { formatMoney, type CartView } from "@/lib/commerce";
import type { MockData } from "./data";

export function cartView(db: MockData, quantities = db.cart): CartView {
  const items: CartView["items"] = [];
  for (const product of db.products) {
    for (const sku of product.skus) {
      const quantity = quantities[sku.id] ?? 0;
      if (quantity > 0)
        items.push({
          skuId: sku.id,
          name: product.name,
          optionLabel: sku.optionLabel,
          quantity,
          available: sku.available,
          unitPrice: sku.price,
          priceLabel: sku.priceLabel,
          purchasable:
            product.status === "active" &&
            sku.active &&
            sku.available >= quantity,
        });
    }
  }
  const subtotal = items.reduce(
    (total, item) => total + item.unitPrice * item.quantity,
    0,
  );
  const shippingFee =
    !items.length || subtotal >= db.settings.freeShippingThreshold
      ? 0
      : db.settings.shippingFee;
  return {
    items,
    subtotal,
    shippingFee,
    total: subtotal + shippingFee,
    totalLabel: formatMoney(subtotal + shippingFee),
  };
}
