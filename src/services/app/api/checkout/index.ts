import { resolveActions } from "@/lib/utils";
export * from "./types";
import { prepare } from "./actions/prepare";
import { confirm } from "./actions/confirm";
export const checkout = resolveActions({ prepare, confirm });
