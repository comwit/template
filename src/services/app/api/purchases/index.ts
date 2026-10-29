import { resolveActions } from "@/lib/utils";
export * from "./types";
import { findAll } from "./actions/find-all";
import { downloadLink } from "./actions/download-link";
export const purchases = resolveActions({ findAll, downloadLink });
