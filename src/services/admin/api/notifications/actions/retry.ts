"use server";
import { createAction } from "@/lib/utils";
import { requireAdmin } from "@/server/auth";
import { commerceAction } from "@/server/commerce";
import { notificationRepository } from "@/server/repository";
import { entityId } from "@/lib/commerce";
async function _retry(id: string): Promise<void> {
  return commerceAction(async () => {
    const actor = await requireAdmin();
    return notificationRepository.retry(entityId.parse(id), actor.id);
  });
}
export const retry = createAction(_retry);
