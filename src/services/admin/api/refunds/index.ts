import { resolveActions } from "@/lib/utils";
export * from "./types";
import { findAll } from "./actions/find-all";
import { decide } from "./actions/decide";
export const adminRefunds = resolveActions({ findAll, decide });
