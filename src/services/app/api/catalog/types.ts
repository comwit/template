import type * as Types from "@/lib/commerce";
import type { PageRequest, Pageable } from "@/server/repository/types";
export type * from "@/lib/commerce";
export interface CatalogAPI {
  findAll(
    filter: Types.ListFilter,
    pageable: PageRequest,
  ): Promise<Pageable<Types.ProductView>>;
  find(id: string): Promise<Types.ProductView>;
  categories(): Promise<Types.CategoryView[]>;
}
