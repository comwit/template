"use server";
import { createAction } from "@/lib/utils";
import { requireAdmin } from "@/server/auth";
import { commerceAction, presentNotification } from "@/server/commerce";
import { notificationRepository } from "@/server/repository";
import {
  listFilterSchema,
  pageSchema,
  type ListFilter,
  type NotificationView,
} from "@/lib/commerce";
import type { PageRequest, Pageable } from "@/server/repository/types";
async function _findAll(
  filter: ListFilter,
  pageable: PageRequest,
): Promise<Pageable<NotificationView>> {
  return commerceAction(async () => {
    await requireAdmin();
    const result = await notificationRepository.findAll(
      listFilterSchema.parse(filter),
      pageSchema.parse(pageable),
    );
    return { ...result, items: result.items.map(presentNotification) };
  });
}
export const findAll = createAction(_findAll);
