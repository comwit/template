"use server";
import { createAction } from "@/lib/utils";
import type * as Types from "../types";
import * as input from "@/lib/commerce";
import { commerceAction } from "@/server/commerce";
import { catalogRepository } from "@/server/repository";
import { requireAdmin } from "@/server/auth";
async function _archive(id: string): Promise<void> {
  return commerceAction(async () => {
    const actor = await requireAdmin();
    await catalogRepository.archive(input.entityId.parse(id), actor.id);
  });
}
export const archive = createAction(_archive);
