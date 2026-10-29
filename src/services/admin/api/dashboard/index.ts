import { resolveActions } from "@/lib/utils";
export * from "./types";
import { summary } from "./actions/summary";
export const adminDashboard = resolveActions({ summary });
