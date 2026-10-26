"use client";
export * from "./types";
import { create } from "@comwit/state";
import { cart } from "./model";
import { manageActions } from "./actions/manage";
import type { CartState, CartActions } from "./types";
export const useCart = create<CartState, CartActions>(cart, {
  actions: [manageActions],
});
