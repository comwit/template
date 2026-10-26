import { resolveActions } from "@/lib/utils";
export * from "./types";
import { prepare } from "./actions/prepare";
import { complete } from "./actions/complete";
export const adminMedia = resolveActions({ prepare, complete });
