import type * as Types from "@/lib/course";
import type { PageRequest, Pageable } from "@/server/repository/types";
export type * from "@/lib/course";
export interface AdminPaymentsAPI {
  findAll(filter: Types.ListFilter, pageable: PageRequest): Promise<Pageable<Types.PaymentRowView>>;
  reconcile(id: string): Promise<string>;
  reconcilePending(): Promise<{ succeeded: number; failed: number }>;
  retryRefund(refundId: string): Promise<string>;
}
