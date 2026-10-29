import { fn } from "storybook/test";

// 토스 결제위젯 SDK 의 스토리북 대역. 위젯은 빈 자리로 그려지고, 결제창은 열리지 않는다.
// 주문 결과는 API 모킹(checkout.prepare/confirm)으로 확인한다.
const PREVIEW_MESSAGE =
  "스토리북에서는 결제창을 열지 않습니다. 주문 결과는 API 모킹으로 확인합니다.";

export const requestPayment = fn(async (_request?: unknown) => {
  throw new Error(PREVIEW_MESSAGE);
});
export const setAmount = fn(async (_amount?: unknown) => {});
const destroy = fn(async () => {});
const on = fn((_event: string, _handler: (...args: unknown[]) => void) => {});
export const renderPaymentMethods = fn(async (_options?: unknown) => ({
  destroy,
  on,
  getSelectedPaymentMethod: fn(async () => ({
    type: "NORMAL",
    method: "카드",
    easyPay: null,
  })),
  updateOptions: fn(async () => {}),
}));
export const renderAgreement = fn(async (_options?: unknown) => ({
  destroy,
  on,
  getAgreementStatus: fn(async () => ({
    agreedRequiredTerms: true,
    agreedTerms: [] as string[],
  })),
}));
export const renderPaymentWindow = fn(async (_options?: unknown) => ({
  destroy,
  on,
}));
export const widgets = fn((_options?: { customerKey: string }) => ({
  setAmount,
  renderPaymentMethods,
  renderAgreement,
  renderPaymentWindow,
  requestPayment,
  requestPaymentWindow: requestPayment,
}));
export const payment = fn((_options?: { customerKey: string }) => ({
  requestPayment,
  requestBillingAuth: requestPayment,
}));
export const loadTossPayments = fn(async (_clientKey: string) => ({
  widgets,
  payment,
}));
export const ANONYMOUS = "ANONYMOUS";
export function clearTossPayments() {}
export function resetPaymentMocks() {
  requestPayment.mockReset();
  setAmount.mockReset();
  destroy.mockReset();
  on.mockReset();
  renderPaymentMethods.mockReset();
  renderAgreement.mockReset();
  renderPaymentWindow.mockReset();
  widgets.mockReset();
  payment.mockReset();
  loadTossPayments.mockReset();
}
