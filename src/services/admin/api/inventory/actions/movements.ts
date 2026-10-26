"use server";
import { createAction } from "@/lib/utils";
import type * as Types from "../types";
import type { PageRequest, Pageable } from "@/server/repository/types";
import * as input from "@/lib/commerce";
import { commerceAction, statusLabel } from "@/server/commerce";
import { catalogRepository } from "@/server/repository";
import { kstCompactDateTime } from "@/lib/kst";
import { requireAdmin } from "@/server/auth";
async function _movements(
  skuId: string,
  pageable: PageRequest,
): Promise<Pageable<Types.MovementView>> {
  return commerceAction(async () => {
    await requireAdmin();
    const result = await catalogRepository.findMovements(
      input.entityId.parse(skuId),
      input.pageSchema.parse(pageable),
    );
    return {
      ...result,
      items: result.items.map((r) => ({
        id: r.id,
        quantity: r.quantity,
        kindLabel: statusLabel(r.kind),
        reason: r.reason,
        createdLabel: kstCompactDateTime(r.createdAt),
      })),
    };
  });
}
export const movements = createAction(_movements);
