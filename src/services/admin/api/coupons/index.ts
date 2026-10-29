import { resolveActions } from "@/lib/utils";
export * from "./types";
import { findAll } from "./actions/find-all";
import { save } from "./actions/save";
import { setActive } from "./actions/set-active";
export const adminCoupons = resolveActions({ findAll, save, setActive });
