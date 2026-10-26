import { model, query } from "@comwit/state";
import { cart as api } from "@/services/app/api/cart";
import type { CartView } from "@/lib/commerce";
import type { CartState } from "./types";
export const cart = model<CartState>({
  cart: query<CartView | null, string>({
    initialData: null,
    queryFn: () => api.find(),
  }),
  isSaving: false,
  error: null,
});
