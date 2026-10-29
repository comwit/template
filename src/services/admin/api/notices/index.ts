import { resolveActions } from "@/lib/utils";
export * from "./types";
import { findAll } from "./actions/find-all";
import { find } from "./actions/find";
import { save } from "./actions/save";
import { remove } from "./actions/remove";
export const adminNotices = resolveActions({ findAll, find, save, remove });
