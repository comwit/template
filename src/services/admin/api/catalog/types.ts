import type * as Types from "@/lib/commerce";
import type { PageRequest, Pageable } from "@/server/repository/types";
export type * from "@/lib/commerce";
export interface AdminCatalogAPI {
  findAll(
    filter: Types.ListFilter,
    pageable: PageRequest,
  ): Promise<Pageable<Types.ProductView>>;
  find(id: string): Promise<Types.ProductView>;
  save(request: Types.ProductInput): Promise<string>;
  archive(id: string): Promise<void>;
  categories(): Promise<Types.CategoryView[]>;
  saveCategory(request: Types.CategoryInput): Promise<string>;
}
