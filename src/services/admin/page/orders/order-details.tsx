"use client";
import { useState } from "react";
import {
  Package,
  MapPin,
  Truck,
  RotateCcw,
  CheckCheck,
  Clock3,
  UserRound,
  X,
} from "lucide-react";
import { Button } from "@/lib/components/ui/button";
import { Alert } from "@/lib/components/ui/alert";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/lib/components/ui/accordion";
import {
  StatusBadge,
  ReferenceValue,
  DateValue,
} from "@/services/admin/_components/commerce";
import type { OrderView, RefundInput, ShipmentInput } from "@/lib/commerce";
import { RefundForm } from "./refund-form";
import { ShipmentForm } from "./shipment-form";
export type OrderDetailsProps = {
  order: OrderView;
  busy: boolean;
  error: string | null;
  onCancel(id: string): void;
  onDeliver(id: string): void;
  onShip(input: ShipmentInput): void;
  onRefund(input: Omit<RefundInput, "requestKey">): void;
  onRetryRefund(id: string): void;
};
export function OrderDetails(props: OrderDetailsProps) {
  const o = props.order;
  const [mode, setMode] = useState<"shipment" | "refund" | null>(null);
  const canShip =
    o.status === "confirmed" &&
    o.fulfillmentStatus === "unfulfilled" &&
    ["paid", "partially_refunded"].includes(o.paymentStatus) &&
    !o.payment?.pendingRefundId;
  const canRefund = Boolean(
    o.payment &&
    o.payment.refundableAmount > 0 &&
    ["done", "partial_cancelled"].includes(o.payment.status) &&
    !o.payment.pendingRefundId,
  );
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1.5">
          <p className="text-title-md" title={o.number}>
            {o.displayNumber ?? o.number}
          </p>
          <p className="flex items-center gap-1.5 text-caption text-muted-foreground">
            <UserRound className="size-3.5" aria-hidden="true" />
            {o.customerEmail}
          </p>
          <div className="flex flex-wrap gap-1.5">
            <StatusBadge status={o.paymentStatus} label={o.paymentLabel} />
            <StatusBadge
              status={o.fulfillmentStatus}
              label={o.fulfillmentLabel}
            />
            {["cancelled", "expired"].includes(o.status) ? (
              <StatusBadge status={o.status} label={o.statusLabel} />
            ) : null}
          </div>
        </div>
        <div className="text-right">
          <p className="text-display-sm font-bold tabular-nums">
            {o.totalLabel}
          </p>
          <p className="text-caption text-muted-foreground">
            배송비 {o.shippingLabel}
          </p>
        </div>
      </div>
      <section className="space-y-1">
        <h3 className="flex items-center gap-1.5 text-title-sm">
          <Package
            className="size-4 text-muted-foreground"
            aria-hidden="true"
          />
          상품
        </h3>
        {o.items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-3 border-b border-border py-3"
          >
            <div className="flex min-w-0 items-center gap-3">
              {item.image ? (
                <img
                  src={item.image.url}
                  width={item.image.width}
                  height={item.image.height}
                  alt=""
                  className="size-10 rounded-control object-cover"
                />
              ) : null}
              <div className="min-w-0">
                <p className="text-body-sm font-semibold">{item.name}</p>
                <div className="flex items-center gap-2 text-caption text-muted-foreground">
                  <span>{item.optionLabel}</span>
                  <ReferenceValue value={item.skuCode}>SKU</ReferenceValue>
                </div>
              </div>
            </div>
            <div className="shrink-0 text-right text-body-sm">
              <p className="font-medium tabular-nums">
                {item.priceLabel} × {item.quantity}
              </p>
              {item.refundedQuantity > 0 ? (
                <span className="text-caption text-warning-surface-foreground">
                  환불 {item.refundedQuantity}개
                </span>
              ) : null}
            </div>
          </div>
        ))}
      </section>
      <div className="flex flex-wrap gap-2">
        {canShip ? (
          <Button
            size="sm"
            aria-expanded={mode === "shipment"}
            onClick={() => setMode(mode === "shipment" ? null : "shipment")}
          >
            <Truck className="size-4" aria-hidden="true" />
            발송
          </Button>
        ) : null}
        {o.fulfillmentStatus === "shipped" && o.status === "confirmed" ? (
          <Button
            size="sm"
            onClick={() => props.onDeliver(o.id)}
            disabled={props.busy}
          >
            <CheckCheck className="size-4" aria-hidden="true" />
            배송 완료
          </Button>
        ) : null}
        {canRefund ? (
          <Button
            size="sm"
            variant="outline"
            aria-expanded={mode === "refund"}
            onClick={() => setMode(mode === "refund" ? null : "refund")}
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            환불
          </Button>
        ) : null}
        {o.status === "pending" && o.paymentStatus === "unpaid" ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => props.onCancel(o.id)}
            disabled={props.busy}
          >
            <X className="size-4" aria-hidden="true" />
            주문 취소
          </Button>
        ) : null}
      </div>
      {o.payment?.lastError ? (
        <Alert tone="warning">결제 확인 필요</Alert>
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
              <RotateCcw className="size-3.5" />
              환불 재시도
            </Button>
          </div>
        </Alert>
      ) : null}
      {mode === "shipment" && canShip ? (
        <div className="rounded-card border border-border p-4">
          <ShipmentForm
            orderId={o.id}
            busy={props.busy}
            onShip={props.onShip}
          />
        </div>
      ) : null}
      {mode === "refund" && canRefund ? (
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
      <section className="rounded-control bg-secondary px-3 py-3">
        <h3 className="mb-1.5 flex items-center gap-1.5 text-title-sm">
          <MapPin className="size-4 text-muted-foreground" aria-hidden="true" />
          배송지
        </h3>
        <p className="text-body-sm text-soft-foreground">
          {o.address.name} · {o.address.phone}
          <br />({o.address.postalCode}) {o.address.address} {o.address.detail}
        </p>
        {o.address.memo ? (
          <p className="mt-1 text-caption text-muted-foreground">
            {o.address.memo}
          </p>
        ) : null}
        {o.shipment ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-2 text-body-sm">
            <Truck
              className="size-4 text-muted-foreground"
              aria-hidden="true"
            />
            <span>{o.shipment.carrier}</span>
            <strong className="tabular-nums">
              {o.shipment.trackingNumber}
            </strong>
          </div>
        ) : null}
      </section>
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
                  <div>
                    <p>{refund.reason}</p>
                    <p className="text-caption text-muted-foreground">
                      {refund.createdLabel} ·{" "}
                      {refund.restock ? "재고 복원" : "재고 유지"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p>{refund.amountLabel}</p>
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
            <p className="break-all text-caption">{o.number}</p>
            <p className="text-caption text-muted-foreground">
              <DateValue value={o.createdLabel} />
            </p>
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
