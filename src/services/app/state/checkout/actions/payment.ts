import { action } from "@comwit/state";
import { checkout as api } from "@/services/app/api/checkout";
import { mutate } from "@/lib/commerce-state";
import type {
  CheckoutInput,
  CheckoutView,
  ConfirmInput,
} from "@/lib/commerce";
import type { CheckoutActions } from "../types";
import { checkout } from "../model";
export const paymentActions = action<CheckoutActions>(({ state }) => {
  class PaymentActions {
    private model = state(checkout);
    // 준비된 주문을 돌려준다. 실패하면 null이고 이전 주문도 비워서 pay()가 옛 주문을 결제하지 않는다.
    async prepare(input: CheckoutInput): Promise<CheckoutView | null> {
      let prepared: CheckoutView | null = null;
      await mutate(this.model, async () => {
        this.model.checkout = null;
        this.model.order = null;
        prepared = await api.prepare(input);
        this.model.checkout = prepared;
      });
      return prepared;
    }
    async pay() {
      await mutate(this.model, async () => {
        const data = this.model.checkout;
        if (!data) throw new Error("주문을 먼저 준비해주세요.");
        const { loadTossPayments } =
          await import("@tosspayments/tosspayments-sdk");
        const sdk = await loadTossPayments(data.clientKey);
        await sdk.payment({ customerKey: data.customerKey }).requestPayment({
          method: "CARD",
          amount: { currency: "KRW", value: data.amount },
          orderId: data.orderId,
          orderName: data.orderName,
          customerEmail: data.customerEmail,
          successUrl: data.successUrl,
          failUrl: data.failUrl,
        });
      });
    }
    async confirm(input: ConfirmInput) {
      await mutate(this.model, async () => {
        this.model.order = await api.confirm(input);
      });
    }
    clear() {
      this.model.checkout = null;
      this.model.order = null;
      this.model.error = null;
    }
  }
  return new PaymentActions();
});
