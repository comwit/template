import { kstCompactDateTime } from "@/lib/kst";
import type { AdminInventoryAPI } from "@/services/admin/api/inventory";
import { findItem, list, mockApi } from "../runtime";
export const adminInventory = {
  findAll: mockApi<AdminInventoryAPI["findAll"]>((db, filter, page) =>
    list(
      db.products.flatMap((product) =>
        product.skus.map((sku) => ({
          ...sku,
          productId: product.id,
          productName: product.name,
        })),
      ),
      filter,
      page,
    ),
  ),
  adjust: mockApi<AdminInventoryAPI["adjust"]>((db, input) => {
    const sku = findItem(
      db.products.flatMap((product) => product.skus),
      input.skuId,
    );
    sku.onHand += input.quantity;
    sku.available = sku.onHand - sku.reserved;
    (db.movements[sku.id] ??= []).unshift({
      id: crypto.randomUUID(),
      quantity: input.quantity,
      reason: input.reason,
      kindLabel: "조정",
      createdLabel: kstCompactDateTime(new Date("2026-10-14T10:00:00+09:00")),
    });
  }),
  movements: mockApi<AdminInventoryAPI["movements"]>((db, id, page) =>
    list(db.movements[id] ?? [], { search: "", status: "" }, page),
  ),
} satisfies AdminInventoryAPI;
