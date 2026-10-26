import { action } from "@comwit/state";
import { cart as api } from "@/services/app/api/cart";
import { mutate } from "@/lib/commerce-state";
import { cart } from "../model";
import type { CartActions } from "../types";
export const manageActions = action<CartActions>(({ state }) => {
  class CartActions {
    private model = state(cart);
    async refresh() {
      await this.model.cart.refetch();
    }
    async setQuantity(skuId: string, quantity: number) {
      await mutate(this.model, async () => {
        await api.setQuantity(skuId, quantity);
        await this.refresh();
      });
    }
  }
  return new CartActions();
});
