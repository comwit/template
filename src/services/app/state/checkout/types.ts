import type { Query } from "@comwit/state";
import type {
  CheckoutView,
  ConfirmInput,
  OrderView,
  QuoteInput,
  QuoteView,
} from "@/lib/course";
export type * from "@/lib/course";
export type CheckoutState = {
  /** 결제 전 금액 미리보기. 쿠폰 코드가 바뀌면 인자가 바뀌어 다시 받는다. */
  quote: Query<QuoteView | null, QuoteInput>;
  checkout: CheckoutView | null;
  order: OrderView | null;
  couponCode: string | null;
  /** 결제위젯이 컨테이너에 그려졌는지(결제 진행 버튼 노출 기준). */
  mounted: boolean;
  isSaving: boolean;
  error: string | null;
};
export type CheckoutActions = {
  setCoupon(code: string): void;
  /** 준비된 주문. 실패(오류는 state.error)했거나 다른 저장이 진행 중이면 null. free 면 이미 수강 등록됐다. */
  prepare(input: { courseId: string }): Promise<CheckoutView | null>;
  /** prepare 뒤 `#payment-method`·`#agreement` 컨테이너에 토스 결제위젯을 그린다. */
  mount(): Promise<void>;
  pay(): Promise<void>;
  confirm(input: ConfirmInput): Promise<void>;
  clear(): void;
};
