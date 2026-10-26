"use server";
import { createAction } from "@/lib/utils";
import { requireAdmin } from "@/server/auth";
import { commerceAction } from "@/server/commerce";
import { notificationRepository } from "@/server/repository";
import { entityId } from "@/lib/commerce";
async function _processPending(): Promise<{
  processed: number;
  failed: number;
}> {
  return commerceAction(async () => {
    const actor = await requireAdmin();
    return notificationRepository.processPending();
  });
}
export const processPending = createAction(_processPending);
