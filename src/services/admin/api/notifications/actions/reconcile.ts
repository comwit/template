"use server";
import { createAction } from "@/lib/utils";
import { requireAdmin } from "@/server/auth";
import { commerceAction } from "@/server/commerce";
import { notificationRepository } from "@/server/repository";
import { entityId } from "@/lib/commerce";
async function _reconcile(id: string): Promise<void> {
  return commerceAction(async () => {
    const actor = await requireAdmin();
    return notificationRepository.reconcile(entityId.parse(id));
  });
}
export const reconcile = createAction(_reconcile);
