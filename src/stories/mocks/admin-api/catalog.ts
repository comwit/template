import { kstCompactDateTime } from "@/lib/kst";
import type { AdminCatalogAPI } from "@/services/admin/api/catalog";
import {
  formatMoney,
  formatPriceRange,
  formatOptions,
  type ProductView,
} from "@/lib/commerce";
import { findItem, list, mockApi } from "../runtime";
export const adminCatalog = {
  findAll: mockApi<AdminCatalogAPI["findAll"]>((db, filter, page) =>
    list(db.products, filter, page),
  ),
  find: mockApi<AdminCatalogAPI["find"]>((db, id) => findItem(db.products, id)),
  save: mockApi<AdminCatalogAPI["save"]>((db, input) => {
    const id = input.id ?? crypto.randomUUID();
    const previous = db.products.find((item) => item.id === id);
    const skus = input.skus.map((sku) => {
      const old = previous?.skus.find((item) => item.id === sku.id);
      return {
        ...sku,
        id: sku.id ?? crypto.randomUUID(),
        priceLabel: formatMoney(sku.price),
        optionLabel: formatOptions(sku.options),
        onHand: old?.onHand ?? 0,
        reserved: old?.reserved ?? 0,
        available: old?.available ?? 0,
      };
    });
    const product: ProductView = {
      ...input,
      id,
      skus,
      statusLabel: { active: "판매 중", draft: "초안", archived: "판매 중지" }[
        input.status
      ],
      priceLabel: formatPriceRange(skus.map((sku) => sku.price)),
      createdLabel:
        previous?.createdLabel ??
        kstCompactDateTime(new Date("2026-10-14T10:00:00+09:00")),
    };
    if (previous) Object.assign(previous, product);
    else db.products.unshift(product);
    return id;
  }),
  archive: mockApi<AdminCatalogAPI["archive"]>((db, id) => {
    Object.assign(findItem(db.products, id), {
      status: "archived",
      statusLabel: "판매 중지",
    });
  }),
  categories: mockApi<AdminCatalogAPI["categories"]>((db) => db.categories),
  saveCategory: mockApi<AdminCatalogAPI["saveCategory"]>((db, input) => {
    const category = { ...input, id: input.id ?? crypto.randomUUID() };
    const previous = db.categories.find((item) => item.id === category.id);
    if (previous) Object.assign(previous, category);
    else db.categories.push(category);
    return category.id;
  }),
} satisfies AdminCatalogAPI;
