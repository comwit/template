"use server";
import { createAction } from "@/lib/utils";
import type * as Types from "../types";
import type { PageRequest, Pageable } from "@/server/repository/types";
import * as input from "@/lib/commerce";
import { commerceAction } from "@/server/commerce";
import { operationsRepository } from "@/server/repository";
import { kstCompactDateTime } from "@/lib/kst";
import { requireAdmin } from "@/server/auth";
async function _findAll(
  filter: Types.ListFilter,
  pageable: PageRequest,
): Promise<Pageable<Types.CustomerView>> {
  return commerceAction(async () => {
    await requireAdmin();
    const result = await operationsRepository.findCustomers(
      input.listFilterSchema.parse(filter),
      input.pageSchema.parse(pageable),
    );
    return {
      ...result,
      items: result.items.map((r) => ({
        ...r,
        name: r.name ?? "",
        createdLabel: kstCompactDateTime(r.createdAt),
      })),
    };
  });
}
export const findAll = createAction(_findAll);
