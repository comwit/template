"use server";
import { createAction } from "@/lib/utils";
import type * as Types from "../types";
import * as input from "@/lib/commerce";
import { commerceAction, optionsLabel } from "@/server/commerce";
import { cartRepository } from "@/server/repository";
import { requireCustomer } from "@/server/auth";
async function _find(): Promise<Types.CartView> {
  return commerceAction(async () => {
    const actor = await requireCustomer();
    const result = await cartRepository.find(actor.id);
    return {
      subtotal: result.subtotal,
      shippingFee: result.shippingFee,
      total: result.total,
      totalLabel: input.formatMoney(result.total),
      items: result.items.map((r) => ({
        skuId: r.sku.id,
        name: r.product.name,
        optionLabel: optionsLabel(r.sku.options),
        quantity: r.item.quantity,
        available: r.sku.onHand - r.sku.reserved,
        unitPrice: r.sku.price,
        priceLabel: input.formatMoney(r.sku.price),
        purchasable:
          !r.sku.deletedAt &&
          r.sku.active &&
          !r.product.deletedAt &&
          r.product.status === "active" &&
          r.sku.onHand - r.sku.reserved >= r.item.quantity,
      })),
    };
  });
}
export const find = createAction(_find);
