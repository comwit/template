import type * as Types from "@/lib/commerce";
import type { PageRequest, Pageable } from "@/server/repository/types";
export type * from "@/lib/commerce";
export interface CheckoutAPI {
  prepare(request: Types.CheckoutInput): Promise<Types.CheckoutView>;
  confirm(request: Types.ConfirmInput): Promise<Types.OrderView>;
}
