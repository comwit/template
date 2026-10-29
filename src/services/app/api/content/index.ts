import { resolveActions } from "@/lib/utils";
export * from "./types";
import { notices } from "./actions/notices";
import { notice } from "./actions/notice";
import { banners } from "./actions/banners";
export const content = resolveActions({ notices, notice, banners });
