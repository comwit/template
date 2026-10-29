import { action } from "@comwit/state";
import type {
  TossPaymentsWidgets,
  WidgetAgreementWidget,
  WidgetPaymentMethodWidget,
} from "@tosspayments/tosspayments-sdk";
import { checkout as api } from "@/services/app/api/checkout";
import { mutate, newRequestKey } from "@/lib/course-state";
import type {
  CheckoutView,
  ConfirmInput,
  ItemType,
  LeadContact,
} from "@/lib/course";
import type { CheckoutActions } from "../types";
import { checkout } from "../model";

// 위젯 인스턴스는 iframe·DOM 을 쥐고 있어 반응형 상태(Proxy)에 넣지 않는다. 모듈 변수로만 보관한다.
let widgets: TossPaymentsWidgets | null = null;
let paymentMethodWidget: WidgetPaymentMethodWidget | null = null;
let agreementWidget: WidgetAgreementWidget | null = null;
async function destroyWidgets() {
  const targets = [paymentMethodWidget, agreementWidget];
  paymentMethodWidget = null;
  agreementWidget = null;
  widgets = null;
  for (const target of targets) {
    try {
      await target?.destroy();
    } catch {
      /* 이미 제거된 위젯 */
    }
  }
}

export const paymentActions = action<CheckoutActions>(({ state }) => {
  class PaymentActions {
    private model = state(checkout);
    setCoupon(code: string) {
      const next = code.trim().toUpperCase();
      this.model.couponCode = next ? next : null;
      // 금액이 바뀌면 준비된 주문·위젯은 무효다. 다시 prepare 한다.
      this.model.checkout = null;
      this.model.mounted = false;
      void destroyWidgets();
    }
    // 준비된 주문을 돌려준다. 실패하면 null 이고 이전 주문도 비워서 pay() 가 옛 주문을 결제하지 않는다.
    async prepare(input: {
      itemType: ItemType;
      itemId: string;
      contact: LeadContact | null;
    }): Promise<CheckoutView | null> {
      let prepared: CheckoutView | null = null;
      await mutate(this.model, async () => {
        this.model.checkout = null;
        this.model.order = null;
        this.model.mounted = false;
        await destroyWidgets();
        prepared = await api.prepare({
          itemType: input.itemType,
          itemId: input.itemId,
          couponCode: this.model.couponCode,
          requestKey: newRequestKey(),
          contact: input.contact,
        });
        this.model.checkout = prepared;
      });
      return prepared;
    }
    async mount() {
      await mutate(this.model, async () => {
        const data = this.model.checkout;
        if (!data) throw new Error("주문을 먼저 준비해주세요.");
        if (data.free) return;
        await destroyWidgets();
        const { loadTossPayments } =
          await import("@tosspayments/tosspayments-sdk");
        const tp = await loadTossPayments(data.clientKey);
        const instance = tp.widgets({ customerKey: data.customerKey });
        await instance.setAmount({ currency: "KRW", value: data.amount });
        const [methods, agreement] = await Promise.all([
          instance.renderPaymentMethods({
            selector: "#payment-method",
            variantKey: "DEFAULT",
          }),
          instance.renderAgreement({
            selector: "#agreement",
            variantKey: "AGREEMENT",
          }),
        ]);
        widgets = instance;
        paymentMethodWidget = methods;
        agreementWidget = agreement;
        this.model.mounted = true;
      });
    }
    async pay() {
      await mutate(this.model, async () => {
        const data = this.model.checkout;
        if (!data) throw new Error("주문을 먼저 준비해주세요.");
        if (!widgets || !this.model.mounted)
          throw new Error("결제 수단을 먼저 불러와주세요.");
        await widgets.requestPayment({
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
      this.model.couponCode = null;
      this.model.mounted = false;
      this.model.error = null;
      void destroyWidgets();
    }
  }
  return new PaymentActions();
});
