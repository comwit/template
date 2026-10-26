"use client";
import { useState } from "react";
import { Button } from "@/lib/components/ui/button";
import { Input } from "@/lib/components/ui/input";
import { Checkbox } from "@/lib/components/ui/checkbox";
import { TextField } from "@/lib/components/ui/text-field";
import type { OrderView, RefundInput } from "@/lib/commerce";
export function RefundForm({
  order,
  busy,
  onRefund,
}: {
  order: OrderView;
  busy: boolean;
  onRefund(request: Omit<RefundInput, "requestKey">): void;
}) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [reason, setReason] = useState("");
  const [shipping, setShipping] = useState(false);
  const [restock, setRestock] = useState(
    order.fulfillmentStatus === "unfulfilled",
  );
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const items: RefundInput["items"] = [];
        for (const item of order.items) {
          const quantity = quantities[item.id] ?? 0;
          if (quantity > 0) items.push({ orderItemId: item.id, quantity });
        }
        onRefund({
          orderId: order.id,
          items,
          reason,
          refundShipping: shipping,
          restock,
        });
      }}
    >
      <h3 className="text-title-md">환불 수량</h3>

      {order.items.map((item) => (
        <div key={item.id} className="flex items-center justify-between gap-3">
          <label htmlFor={`refund-${item.id}`} className="text-body-sm">
            {item.name} · {item.optionLabel}
            <span className="block text-caption text-muted-foreground">
              환불 가능 {item.refundableQuantity}개
            </span>
          </label>
          <Input
            id={`refund-${item.id}`}
            className="w-24"
            type="number"
            min={0}
            max={item.refundableQuantity}
            step={1}
            value={quantities[item.id] ?? 0}
            onChange={(e) =>
              setQuantities({
                ...quantities,
                [item.id]: Number(e.target.value),
              })
            }
            disabled={!item.refundableQuantity}
          />
        </div>
      ))}
      <div className="flex flex-wrap gap-5">
        <label className="flex items-center gap-2 text-body-sm">
          <Checkbox
            checked={shipping}
            onCheckedChange={setShipping}
            disabled={!order.shippingFee}
          />
          배송비 포함
        </label>
        <label className="flex items-center gap-2 text-body-sm">
          <Checkbox
            title="실제 반품 입고를 확인한 경우에만 재고를 복원합니다."
            aria-description="실제 반품 입고를 확인한 경우에만 선택"
            checked={restock}
            onCheckedChange={setRestock}
          />
          재고 복원
        </label>
      </div>
      <TextField label="환불 사유" required>
        <Input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          minLength={2}
          maxLength={120}
          required
        />
      </TextField>
      <Button type="submit" variant="destructive" disabled={busy}>
        선택 항목 환불
      </Button>
    </form>
  );
}
