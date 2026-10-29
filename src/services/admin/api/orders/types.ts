import type * as Types from "@/lib/course";
import type { PageRequest, Pageable } from "@/server/repository/types";
export type * from "@/lib/course";
export interface AdminOrdersAPI {
  findAll(filter: Types.ListFilter, pageable: PageRequest): Promise<Pageable<Types.OrderSummary>>;
  find(id: string): Promise<Types.OrderView>;
  cancel(id: string): Promise<void>;
  refund(request: Types.RefundInput): Promise<string>;
  expire(): Promise<number>;
}
