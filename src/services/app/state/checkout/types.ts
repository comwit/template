import type {
  CheckoutInput,
  CheckoutView,
  ConfirmInput,
  OrderView,
} from "@/lib/commerce";
export type * from "@/lib/commerce";
export type CheckoutState = {
  checkout: CheckoutView | null;
  order: OrderView | null;
  isSaving: boolean;
  error: string | null;
};
export type CheckoutActions = {
  /** 준비된 주문. 실패(오류는 state.error)했거나 다른 저장이 진행 중이면 null. null이 아니면 이어서 pay()를 부른다. */
  prepare(input: CheckoutInput): Promise<CheckoutView | null>;
  pay(): Promise<void>;
  confirm(input: ConfirmInput): Promise<void>;
  clear(): void;
};
