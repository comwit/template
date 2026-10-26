import { resolveActions } from "@/lib/utils";
export * from "./types";
import { findAll } from "./actions/find-all";
import { find } from "./actions/find";
import { categories } from "./actions/categories";
export const catalog = resolveActions({ findAll, find, categories });
