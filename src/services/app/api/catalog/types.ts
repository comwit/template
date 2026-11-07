import type * as Types from "@/lib/commerce";
import type { PageRequest, Pageable } from "@/server/repository/types";
export type * from "@/lib/commerce";
export interface CatalogAPI {
  findAll(
    filter: Types.ListFilter,
    pageable: PageRequest,
  ): Promise<Pageable<Types.ProductView>>;
  /** 없는·비공개·잘못된 id 는 null. 상세 query 는 null 을 not-found 로 그린다. */
  find(id: string): Promise<Types.ProductView | null>;
  categories(): Promise<Types.CategoryView[]>;
}
