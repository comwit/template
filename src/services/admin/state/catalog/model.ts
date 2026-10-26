import { model, query, keepPreviousData } from "@comwit/state";
import { adminCatalog } from "@/services/admin/api/catalog";
import {
  emptyPage,
  type ProductInput,
  type ProductView,
  type CategoryView,
} from "@/lib/commerce";
import type { Pageable } from "@/server/repository/types";
import type { CatalogState, ListArgs } from "./types";
export const freshDraft = (): ProductInput => ({
  name: "",
  slug: "",
  categoryId: null,
  description: "",
  status: "draft",
  images: [],
  skus: [{ code: "", price: 0, options: [], active: true }],
});
export const catalog = model<CatalogState>({
  list: query<Pageable<ProductView>, ListArgs>({
    initialData: emptyPage<ProductView>(),
    queryFn: (args) => adminCatalog.findAll(args.filter, args.pageable),
    placeholderData: keepPreviousData,
  }),
  categories: query<CategoryView[]>({
    initialData: [],
    queryFn: () => adminCatalog.categories(),
  }),
  filter: { search: "", status: "" },
  page: 1,
  draft: freshDraft(),
  editorOpen: false,
  isSaving: false,
  error: null,
});
