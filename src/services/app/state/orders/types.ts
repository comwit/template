import type { Query } from "@comwit/state";
import type { Pageable } from "@/server/repository/types";
import type { OrderSummary, OrderView } from "@/lib/course";
export type * from "@/lib/course";
export type DomainState = {
  list: Query<Pageable<OrderSummary>, { page: number }>;
  page: number;
  detail: Query<OrderView | null, string>;
  isSaving: boolean;
  error: string | null;
};
export type DomainActions = {
  setPage(page: number): void;
  refresh(): Promise<void>;
  /** 미결제 주문 취소(확인 팝업). */
  cancel(id: string): Promise<void>;
  requestRefund(orderId: string, reason: string): Promise<void>;
};
