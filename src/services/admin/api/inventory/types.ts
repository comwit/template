import type * as Types from "@/lib/commerce";
import type { PageRequest, Pageable } from "@/server/repository/types";
export type * from "@/lib/commerce";
export interface AdminInventoryAPI {
  findAll(
    filter: Types.ListFilter,
    pageable: PageRequest,
  ): Promise<Pageable<Types.InventoryView>>;
  adjust(request: Types.StockInput): Promise<void>;
  movements(
    skuId: string,
    pageable: PageRequest,
  ): Promise<Pageable<Types.MovementView>>;
}
