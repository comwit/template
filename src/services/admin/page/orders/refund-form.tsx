"use client";
import { useState } from "react";
import { Button } from "@/lib/components/ui/button";
import { Input } from "@/lib/components/ui/input";
import { TextField } from "@/lib/components/ui/text-field";
import type { OrderView, RefundInput } from "@/lib/course";
export function RefundForm({
  order,
  busy,
  onRefund,
}: {
  order: OrderView;
  busy: boolean;
  onRefund(request: Omit<RefundInput, "requestKey">): void;
}) {
  const [reason, setReason] = useState("");
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onRefund({ orderId: order.id, reason });
      }}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-title-md">전액 환불</h3>
        <p className="text-body-sm font-semibold tabular-nums">
          {order.payment?.amountLabel ?? order.totalLabel}
        </p>
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
        전액 환불
      </Button>
    </form>
  );
}
