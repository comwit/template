import { resolveActions } from "@/lib/utils";
export * from "./types";
import { find } from "./actions/find";
export const adminSettings = resolveActions({ find });
