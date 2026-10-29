import { resolveActions } from "@/lib/utils";
export * from "./types";
import { findAll } from "./actions/find-all";
import { save } from "./actions/save";
import { remove } from "./actions/remove";
export const adminBanners = resolveActions({ findAll, save, remove });
