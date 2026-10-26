import { resolveActions } from "@/lib/utils";
export * from "./types";
import { findAll } from "./actions/find-all";
import { adjust } from "./actions/adjust";
import { movements } from "./actions/movements";
export const adminInventory = resolveActions({ findAll, adjust, movements });
