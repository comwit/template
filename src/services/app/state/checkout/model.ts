import { model } from "@comwit/state";
import type { CheckoutState } from "./types";
export const checkout = model<CheckoutState>({
  checkout: null,
  order: null,
  isSaving: false,
  error: null,
});
