import type { CartAPI } from "@/services/app/api/cart";
import { mockApi } from "../runtime";
import { cartView } from "../commerce";
export const cart = {
  find: mockApi<CartAPI["find"]>((db) => cartView(db)),
  setQuantity: mockApi<CartAPI["setQuantity"]>((db, skuId, quantity) => {
    if (!Number.isInteger(quantity) || quantity < 0)
      throw new Error("수량을 확인해주세요.");
    db.cart[skuId] = quantity;
  }),
} satisfies CartAPI;
