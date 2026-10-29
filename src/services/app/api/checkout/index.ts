import { resolveActions } from "@/lib/utils";
export * from "./types";
import { quote } from "./actions/quote";
import { prepare } from "./actions/prepare";
import { confirm } from "./actions/confirm";
export const checkout = resolveActions({ quote, prepare, confirm });
