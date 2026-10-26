import type * as Types from "@/lib/commerce";
import type { PageRequest, Pageable } from "@/server/repository/types";
export type * from "@/lib/commerce";
export interface CartAPI {
  find(): Promise<Types.CartView>;
  setQuantity(skuId: string, quantity: number): Promise<void>;
}
