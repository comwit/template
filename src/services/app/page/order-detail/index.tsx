"use client";

import { useState } from "react";
import Link from "next/link";
import { useOrders } from "@/services/app/state/orders";
import { siteText, courseText } from "@/lib/ui-text";
import { Button } from "@/lib/components/ui/button";
import { Textarea } from "@/lib/components/ui/textarea";
import { TextField } from "@/lib/components/ui/text-field";

// 빈 깡통. 파생 프로젝트에서 섹션 파일로 나눠 채운다(page.ai.md).
// 읽는 상태: useOrders detail(.load(orderId)), isSaving. 액션: cancel(미결제 취소), requestRefund(환불 신청).
export default function OrderDetail({ orderId }: { orderId: string }) {
  const [reason, setReason] = useState("");
  const orders = useOrders((state) => ({
    detail: state.detail.load(orderId),
    isSaving: state.isSaving,
    actions: state.actions,
  }));
  const detail = orders.detail;
  const order = detail.data;

  if (detail.isError)
    return (
      <main className="mx-auto w-full max-w-5xl px-6 py-16">
        <h1 className="text-display-sm text-balance">
          {siteText.pages["order-detail"]}
        </h1>
        <p className="mt-8 text-body text-destructive">
          {detail.error}{" "}
          <Link href="/login" className="underline">
            {siteText.pages["login"]}
          </Link>
        </p>
      </main>
    );
  if (detail.isLoading || !order)
    return (
      <main className="mx-auto w-full max-w-5xl px-6 py-16">
        <h1 className="text-display-sm text-balance">
          {siteText.pages["order-detail"]}
        </h1>
        <p className="mt-8 text-body text-muted-foreground">{courseText.loading}</p>
      </main>
    );

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-16">
      <p className="text-body-sm text-muted-foreground">
        {siteText.pages["order-detail"]} · {order.displayNumber}
      </p>
      <h1 className="mt-2 text-display-sm text-balance">{order.courseTitle}</h1>
      <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-body">
        <dt className="text-muted-foreground">상태</dt>
        <dd>{order.statusLabel} · {order.paymentLabel}</dd>
        <dt className="text-muted-foreground">주문일</dt>
        <dd>{order.createdLabel}</dd>
        <dt className="text-muted-foreground">정가</dt>
        <dd>{order.listPriceLabel}</dd>
        <dt className="text-muted-foreground">할인</dt>
        <dd>{order.discountLabel}</dd>
        <dt className="text-muted-foreground">쿠폰</dt>
        <dd>
          {order.couponDiscountLabel}
          {order.couponCode ? ` (${order.couponCode})` : ""}
        </dd>
        <dt className="text-muted-foreground">결제 금액</dt>
        <dd>{order.totalLabel}</dd>
      </dl>

      {order.payment ? (
        <section className="mt-8">
          <h2 className="text-title-lg">결제</h2>
          <p className="mt-2 text-body">
            {order.payment.statusLabel} · {order.payment.amountLabel} ·{" "}
            {order.payment.method} · {order.payment.createdLabel}
            {order.payment.refundedAmount > 0
              ? ` · 환불 ${order.payment.refundedLabel}`
              : ""}
          </p>
          {order.payment.receiptUrl ? (
            <Link
              href={order.payment.receiptUrl}
              target="_blank"
              rel="noreferrer"
              className="text-body-sm underline"
            >
              영수증
            </Link>
          ) : null}
        </section>
      ) : null}

      {order.refunds.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-title-lg">환불</h2>
          <ul className="mt-2 flex flex-col gap-1 text-body">
            {order.refunds.map((refund) => (
              <li key={refund.id}>
                {refund.statusLabel} · {refund.amountLabel} · {refund.reason} ·{" "}
                {refund.createdLabel}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {order.refundRequest ? (
        <section className="mt-8">
          <h2 className="text-title-lg">{courseText.refunds}</h2>
          <p className="mt-2 text-body">
            {order.refundRequest.statusLabel} · {order.refundRequest.amountLabel}{" "}
            · {order.refundRequest.createdLabel}
          </p>
          <p className="text-body-sm text-soft-foreground">
            {order.refundRequest.reason}
          </p>
          {order.refundRequest.note ? (
            <p className="text-body-sm text-muted-foreground">
              답변: {order.refundRequest.note}
            </p>
          ) : null}
        </section>
      ) : null}

      <section className="mt-8 flex flex-col gap-3">
        {order.enrollmentId ? (
          <Button asChild variant="outline" className="w-fit">
            <Link href={`/learn/${order.courseId}`}>{siteText.pages["learn"]}</Link>
          </Button>
        ) : null}
        {order.status === "pending" ? (
          <div className="flex gap-2">
            <Button asChild className="w-fit">
              <Link href={`/checkout/${order.courseId}`}>결제 계속하기</Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={orders.isSaving}
              onClick={() => orders.actions.cancel(order.id)}
            >
              미결제 취소
            </Button>
          </div>
        ) : null}
        {order.canRequestRefund ? (
          <div className="flex max-w-lg flex-col gap-2">
            <TextField label="환불 사유" required>
              <Textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="환불을 신청하는 이유를 적어주세요."
              />
            </TextField>
            <Button
              type="button"
              className="w-fit"
              disabled={orders.isSaving || reason.trim().length < 2}
              onClick={async () => {
                await orders.actions.requestRefund(order.id, reason.trim());
                setReason("");
              }}
            >
              {courseText.refunds}
            </Button>
          </div>
        ) : null}
      </section>

      {order.history.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-title-lg">이력</h2>
          <ul className="mt-2 flex flex-col gap-1 text-body-sm text-muted-foreground">
            {order.history.map((entry) => (
              <li key={entry.id}>
                {entry.createdLabel} · {entry.action}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="mt-8 text-body-sm">
        <Link href="/account/orders" className="underline">
          {siteText.pages["orders"]}
        </Link>
      </p>
    </main>
  );
}
