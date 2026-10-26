import type * as Types from "@/lib/commerce";
import type { PageRequest, Pageable } from "@/server/repository/types";
export type * from "@/lib/commerce";
export interface AdminPaymentsAPI {
  findAll(
    filter: Types.ListFilter,
    pageable: PageRequest,
  ): Promise<Pageable<Types.PaymentView>>;
  reconcile(id: string): Promise<string>;
  retryRefund(id: string): Promise<string>;
  reconcilePending(): Promise<{ succeeded: number; failed: number }>;
}
