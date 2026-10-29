"use server";
import { createAction } from "@/lib/utils";
import type * as Types from "../types";
import { courseAction, presentDashboard } from "@/server/course";
import { operationsRepository } from "@/server/repository";
import { requireAdmin } from "@/server/auth";
async function _summary(): Promise<Types.DashboardView> {
  return courseAction(async () => {
    await requireAdmin();
    return presentDashboard(await operationsRepository.dashboard());
  });
}
export const summary = createAction(_summary);
