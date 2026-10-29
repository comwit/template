"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useOrders } from "@/services/app/state/orders";
import { siteText, courseText } from "@/lib/ui-text";

// 빈 깡통. 파생 프로젝트에서 섹션 파일로 나눠 채운다(page.ai.md).
// 토스 successUrl/failUrl 핸들러가 `?payment=success|review|failed&order=<id>` 로 보낸다(server/course/handlers.ts).
// 읽는 상태: useSearchParams(Suspense 필수) + useOrders detail(.load(order)) — order 가 있을 때만.
const MESSAGES = {
  success: "결제가 완료됐습니다. 바로 수강할 수 있습니다.",
  review: "결제 확인 중입니다. 잠시 뒤 결제 내역에서 상태를 확인해주세요.",
  failed: "결제가 완료되지 않았습니다. 다시 시도해주세요.",
} as const;
export default function CheckoutResult() {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-16">
      <h1 className="text-display-sm text-balance">
        {siteText.pages["checkout-result"]}
      </h1>
      <Suspense fallback={null}>
        <ResultBody />
      </Suspense>
    </main>
  );
}

function ResultBody() {
  const params = useSearchParams();
  const payment = params.get("payment");
  const orderId = params.get("order");
  const orders = useOrders((state) => ({
    detail: orderId ? state.detail.load(orderId) : state.detail,
  }));
  const message =
    payment && payment in MESSAGES
      ? MESSAGES[payment as keyof typeof MESSAGES]
      : "결제 결과를 확인할 수 없습니다.";
  const order = orderId ? orders.detail.data : null;
  return (
    <>
      <p className="mt-6 text-body">{message}</p>
      {orderId ? (
        orders.detail.isError ? (
          <p className="mt-4 text-body-sm text-destructive">
            {orders.detail.error}
          </p>
        ) : orders.detail.isLoading || !order ? (
          <p className="mt-4 text-body-sm text-muted-foreground">
            {courseText.loading}
          </p>
        ) : (
          <section className="mt-4">
            <p className="text-body-sm text-muted-foreground">
              {order.displayNumber} · {order.itemTypeLabel}
            </p>
            <p className="text-title-md">{order.itemTitle}</p>
            <p className="text-body">
              {order.totalLabel} · {order.statusLabel} · {order.paymentLabel}
            </p>
            <p className="mt-3 flex gap-3 text-body-sm">
              {order.enrollmentId && order.courseId ? (
                <Link href={`/learn/${order.courseId}`} className="underline">
                  {siteText.pages["learn"]}
                </Link>
              ) : null}
              {order.purchaseId ? (
                <Link href="/account/products" className="underline">
                  {siteText.pages["my-products"]}
                </Link>
              ) : null}
              <Link href={`/account/orders/${order.id}`} className="underline">
                {siteText.pages["order-detail"]}
              </Link>
            </p>
          </section>
        )
      ) : null}
      <p className="mt-8 flex gap-3 text-body-sm">
        <Link href="/account/orders" className="underline">
          {siteText.pages["orders"]}
        </Link>
        <Link href="/courses" className="underline">
          {siteText.pages["courses"]}
        </Link>
      </p>
    </>
  );
}
