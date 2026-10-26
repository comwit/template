import { resolveActions } from "@/lib/utils";
export * from "./types";
import { find } from "./actions/find";
import { setQuantity } from "./actions/set-quantity";
export const cart = resolveActions({ find, setQuantity });
