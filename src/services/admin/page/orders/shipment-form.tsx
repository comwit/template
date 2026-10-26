"use client";
import { useState } from "react";
import { Button } from "@/lib/components/ui/button";
import { Input } from "@/lib/components/ui/input";
import { TextField } from "@/lib/components/ui/text-field";
import type { ShipmentInput } from "@/lib/commerce";
export function ShipmentForm({
  orderId,
  busy,
  onShip,
}: {
  orderId: string;
  busy: boolean;
  onShip(input: ShipmentInput): void;
}) {
  const [carrier, setCarrier] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onShip({ orderId, carrier, trackingNumber });
      }}
    >
      <h3 className="text-title-md">송장</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label="택배사" required>
          <Input
            value={carrier}
            onChange={(e) => setCarrier(e.target.value)}
            required
          />
        </TextField>
        <TextField label="송장 번호" required>
          <Input
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            minLength={4}
            required
          />
        </TextField>
      </div>
      <Button type="submit" disabled={busy}>
        발송
      </Button>
    </form>
  );
}
