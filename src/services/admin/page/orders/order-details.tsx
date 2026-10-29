"use client";
import { useState } from "react";
import Link from "next/link";
import {
  RotateCcw,
  Clock3,
  UserRound,
  X,
  ReceiptText,
  MessageSquareText,
} from "lucide-react";
import { Button } from "@/lib/components/ui/button";
import { Alert } from "@/lib/components/ui/alert";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/lib/components/ui/accordion";
import { AdminDefinitionList } from "@/services/admin/_components";
import {
  StatusBadge,
  DateValue,
} from "@/services/admin/_components/course";
import type { OrderView, RefundInput } from "@/lib/course";
import { RefundForm } from "./refund-form";
export type OrderDetailsProps = {
  order: OrderView;
  busy: boolean;
  error: string | null;
  onCancel(id: string): void;
  onRefund(input: Omit<RefundInput, "requestKey">): void;
  onRetryRefund(id: string): void;
};
export function OrderDetails(props: OrderDetailsProps) {
  const o = props.order;
  const [refundOpen, setRefundOpen] = useState(false);
  const canCancel = o.status === "pending";
  const canRefund = Boolean(
    o.payment &&
    o.payment.status === "done" &&
    o.payment.refundableAmount > 0 &&
    !o.payment.pendingRefundId,
  );
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1.5">
          <p className="text-title-md" title={o.number}>
            {o.displayNumber}
          </p>
          <p className="flex items-center gap-1.5 text-caption text-muted-foreground">
            <UserRound className="size-3.5" aria-hidden="true" />
            {o.customerEmail}
          </p>
          <div className="flex flex-wrap gap-1.5">
            <StatusBadge status={o.paymentStatus} label={o.paymentLabel} />
            <StatusBadge status={o.status} label={o.statusLabel} />
          </div>
        </div>
        <div className="text-right">
          <p className="text-display-sm font-bold tabular-nums">
            {o.totalLabel}
          </p>
          <p className="text-caption text-muted-foreground">
            <DateValue value={o.createdLabel} />
          </p>
        </div>
      </div>
      <AdminDefinitionList
        items={[
          { label: "강의", value: o.courseTitle },
          { label: "정가", value: o.listPriceLabel },
          { label: "강의 할인", value: o.discountLabel },
          {
            label: "쿠폰 할인",
            value: o.couponCode
              ? `${o.couponDiscountLabel} (${o.couponCode})`
              : o.couponDiscountLabel,
          },
          { label: "결제 금액", value: o.totalLabel },
          {
            label: "결제 수단",
            value: o.payment ? (
              <span className="flex flex-wrap items-center gap-2">
                <span>
                  {o.payment.method}
                  {o.payment.mode === "test" ? " · 테스트" : ""}
                </span>
                {o.payment.receiptUrl ? (
                  <Link
                    href={o.payment.receiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-caption text-primary underline-offset-2 hover:underline"
                  >
                    <ReceiptText className="size-3.5" aria-hidden="true" />
                    영수증
                  </Link>
                ) : null}
              </span>
            ) : (
              "—"
            ),
          },
          {
            label: "승인",
            value: o.payment ? (
              <span className="flex flex-wrap items-center gap-2">
                <StatusBadge
                  status={o.payment.status}
                  label={o.payment.statusLabel}
                />
                <span className="text-caption text-muted-foreground tabular-nums">
                  {o.payment.createdLabel}
                </span>
              </span>
            ) : (
              "—"
            ),
          },
        ]}
      />
      <div className="flex flex-wrap gap-2">
        {canCancel ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => props.onCancel(o.id)}
            disabled={props.busy}
          >
            <X className="size-4" aria-hidden="true" />
            미결제 취소
          </Button>
        ) : null}
        {canRefund ? (
          <Button
            size="sm"
            variant="outline"
            aria-expanded={refundOpen}
            onClick={() => setRefundOpen(!refundOpen)}
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            전액 환불
          </Button>
        ) : null}
      </div>
      {o.payment?.lastError ? (
        <Alert tone="warning">결제 확인 필요 · {o.payment.lastError}</Alert>
      ) : null}
      {o.payment?.pendingRefundId ? (
        <Alert tone="warning">
          <div className="flex items-center justify-between gap-3">
            <span>환불 확인 필요</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => props.onRetryRefund(o.payment!.pendingRefundId!)}
              disabled={props.busy}
            >
              <RotateCcw className="size-3.5" aria-hidden="true" />
              환불 재확인
            </Button>
          </div>
        </Alert>
      ) : null}
      {refundOpen && canRefund ? (
        <div className="rounded-card border border-border p-4">
          <RefundForm
            key={o.id}
            order={o}
            busy={props.busy}
            onRefund={props.onRefund}
          />
        </div>
      ) : null}
      {props.error ? <Alert tone="destructive">{props.error}</Alert> : null}
      {o.refundRequest ? (
        <section className="rounded-control bg-secondary px-3 py-3">
          <h3 className="mb-1.5 flex items-center justify-between gap-2 text-title-sm">
            <span className="flex items-center gap-1.5">
              <MessageSquareText
                className="size-4 text-muted-foreground"
                aria-hidden="true"
              />
              수강생 환불 신청
            </span>
            <StatusBadge
              status={o.refundRequest.status}
              label={o.refundRequest.statusLabel}
            />
          </h3>
          <p className="whitespace-pre-wrap text-body-sm text-soft-foreground">
            {o.refundRequest.reason}
          </p>
          <p className="mt-1 text-caption text-muted-foreground">
            {o.refundRequest.createdLabel}
            {o.refundRequest.decidedLabel
              ? ` · 처리 ${o.refundRequest.decidedLabel}`
              : ""}
          </p>
          {o.refundRequest.note ? (
            <p className="mt-2 border-t border-border pt-2 text-caption">
              처리 메모: {o.refundRequest.note}
            </p>
          ) : null}
        </section>
      ) : null}
      <Accordion type="multiple">
        {o.refunds.length ? (
          <AccordionItem value="refunds">
            <AccordionTrigger className="py-3">
              <span className="flex items-center gap-2">
                <RotateCcw className="size-4" aria-hidden="true" />
                환불 내역{" "}
                <span className="text-caption text-muted-foreground">
                  {o.refunds.length}
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-3">
              {o.refunds.map((refund) => (
                <div
                  key={refund.id}
                  className="flex items-center justify-between gap-3 text-body-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate">{refund.reason}</p>
                    <p className="text-caption text-muted-foreground">
                      {refund.createdLabel}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="tabular-nums">{refund.amountLabel}</p>
                    <StatusBadge
                      status={refund.status}
                      label={refund.statusLabel}
                    />
                  </div>
                </div>
              ))}
            </AccordionContent>
          </AccordionItem>
        ) : null}
        <AccordionItem value="history">
          <AccordionTrigger className="py-3">
            <span className="flex items-center gap-2">
              <Clock3 className="size-4" aria-hidden="true" />
              주문 정보·이력
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-2">
            <p className="break-all font-mono text-caption">{o.number}</p>
            {o.status === "pending" ? (
              <p className="text-caption text-muted-foreground">
                결제 기한 {o.expiresLabel}
              </p>
            ) : null}
            {o.history.map((history) => (
              <div
                key={history.id}
                className="flex justify-between gap-3 text-caption"
              >
                <span>{history.action}</span>
                <span className="text-muted-foreground">
                  {history.createdLabel}
                </span>
              </div>
            ))}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
