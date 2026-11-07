import type { CatalogAPI } from "@/services/app/api/catalog";
import { list, mockApi } from "../runtime";
export const catalog = {
  findAll: mockApi<CatalogAPI["findAll"]>((db, filter, page) =>
    list(
      db.products.filter((p) => p.status === "active"),
      filter,
      page,
    ),
  ),
  // 실제 API 와 같이 없는 상품은 null (상세의 not-found 분기).
  find: mockApi<CatalogAPI["find"]>(
    (db, id) =>
      db.products.find((p) => p.status === "active" && p.id === id) ?? null,
  ),
  categories: mockApi<CatalogAPI["categories"]>((db) => db.categories),
} satisfies CatalogAPI;
