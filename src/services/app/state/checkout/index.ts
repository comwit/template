"use client";
export * from "./types";
import { create } from "@comwit/state";
import { checkout } from "./model";
import { paymentActions } from "./actions/payment";
import type { CheckoutState, CheckoutActions } from "./types";
export const useCheckout = create<CheckoutState, CheckoutActions>(checkout, {
  actions: [paymentActions],
});
