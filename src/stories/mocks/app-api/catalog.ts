import type { CatalogAPI } from "@/services/app/api/catalog";
import { findItem, list, mockApi } from "../runtime";
export const catalog = {
  findAll: mockApi<CatalogAPI["findAll"]>((db, filter, page) =>
    list(
      db.products.filter((p) => p.status === "active"),
      filter,
      page,
    ),
  ),
  find: mockApi<CatalogAPI["find"]>((db, id) =>
    findItem(
      db.products.filter((p) => p.status === "active"),
      id,
    ),
  ),
  categories: mockApi<CatalogAPI["categories"]>((db) => db.categories),
} satisfies CatalogAPI;
