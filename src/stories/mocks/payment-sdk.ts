import { fn } from "storybook/test";
export const requestPayment = fn(async () => {
  throw new Error(
    "스토리북에서는 결제창을 열지 않습니다. 주문 결과는 API 모킹으로 확인합니다.",
  );
});
export const loadTossPayments = fn(async () => ({
  payment: () => ({ requestPayment }),
}));
export function resetPaymentMocks() {
  requestPayment.mockReset();
  loadTossPayments.mockReset();
}
