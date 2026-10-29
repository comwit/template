"use server";
import { createAction } from "@/lib/utils";
import type * as Types from "../types";
import { courseAction, presentSettings } from "@/server/course";
import { operationsRepository } from "@/server/repository";
import { requireAdmin } from "@/server/auth";
async function _find(): Promise<Types.SettingsView> {
  return courseAction(async () => {
    await requireAdmin();
    return presentSettings(operationsRepository.settings());
  });
}
export const find = createAction(_find);
