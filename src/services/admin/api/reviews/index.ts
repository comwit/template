import { resolveActions } from "@/lib/utils";
export * from "./types";
import { findAll } from "./actions/find-all";
import { reply } from "./actions/reply";
import { setVisibility } from "./actions/set-visibility";
export const adminReviews = resolveActions({ findAll, reply, setVisibility });
