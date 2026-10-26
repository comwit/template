import type { Query } from "@comwit/state";
import type { CartView } from "@/lib/commerce";
export type * from "@/lib/commerce";
export type CartState = {
  cart: Query<CartView | null, string>;
  isSaving: boolean;
  error: string | null;
};
export type CartActions = {
  setQuantity(skuId: string, quantity: number): Promise<void>;
  refresh(): Promise<void>;
};
