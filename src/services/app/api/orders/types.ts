import type * as Types from "@/lib/course";
import type { PageRequest, Pageable } from "@/server/repository/types";
export type * from "@/lib/course";
export interface OrdersAPI {
  findAll(pageable: PageRequest): Promise<Pageable<Types.OrderSummary>>;
  find(id: string): Promise<Types.OrderView>;
  cancel(id: string): Promise<void>;
  requestRefund(request: Types.RefundRequestInput): Promise<string>;
}
