"use client";
import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { SegmentedControl } from "@/lib/components/ui/segmented-control";
import { useState } from "react";
import { useInventory } from "@/services/admin/state/inventory";
import { InventorySection } from "./inventory-section";
import { Button } from "@/lib/components/ui/button";
import { Input } from "@/lib/components/ui/input";
import { TextField } from "@/lib/components/ui/text-field";
import { Alert } from "@/lib/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/lib/components/ui/dialog";
import { QueryMessage } from "@/services/admin/_components/commerce";
export function InventoryContent() {
  const inventory = useInventory((s) => ({
    list: s.list.load({
      filter: s.filter,
      pageable: { page: s.page, limit: 20 },
    }),
    movements: s.selectedId ? s.movements.load(s.selectedId) : s.movements,
    selectedId: s.selectedId,
    filter: s.filter,
    busy: s.isSaving,
    error: s.error,
    actions: s.actions,
  }));
  const [quantity, setQuantity] = useState(1);
  const [direction, setDirection] = useState<"in" | "out">("in");
  const [reason, setReason] = useState("");
  return (
    <>
      <InventorySection
        query={inventory.list}
        filter={inventory.filter}
        onFilter={inventory.actions.setFilter}
        onPage={inventory.actions.setPage}
        onRefresh={() => void inventory.actions.refresh()}
        onSelect={inventory.actions.select}
      />
      <Dialog
        open={Boolean(inventory.selectedId)}
        onOpenChange={(open) => {
          if (!open) inventory.actions.select(null);
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>재고 입출고</DialogTitle>
            <DialogDescription className="sr-only">
              입고는 양수, 출고·실사는 음수로 입력하세요. 예약 수량은
              보호됩니다.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (inventory.selectedId)
                void inventory.actions.adjust({
                  skuId: inventory.selectedId,
                  quantity: direction === "in" ? quantity : -quantity,
                  reason,
                });
            }}
          >
            <SegmentedControl
              aria-label="입출고 구분"
              value={direction}
              onValueChange={setDirection}
              options={[
                {
                  value: "in",
                  label: (
                    <>
                      <ArrowDownToLine className="size-4" aria-hidden="true" />
                      입고
                    </>
                  ),
                },
                {
                  value: "out",
                  label: (
                    <>
                      <ArrowUpFromLine className="size-4" aria-hidden="true" />
                      출고
                    </>
                  ),
                },
              ]}
            />
            <TextField label="수량" required>
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                step={1}
                min={1}
                required
              />
            </TextField>
            <TextField label="사유" required>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="예: 신규 입고, 파손, 실사 조정"
                minLength={2}
                required
              />
            </TextField>
            {inventory.error ? (
              <Alert tone="destructive">{inventory.error}</Alert>
            ) : null}
            <Button type="submit" disabled={inventory.busy || quantity <= 0}>
              재고 반영
            </Button>
          </form>
          <section className="space-y-3">
            <h2 className="text-title-md">최근 입출고</h2>
            <QueryMessage
              isError={inventory.movements.isError}
              isLoading={inventory.movements.isLoading}
              error={inventory.movements.error}
            >
              {inventory.movements.data.items.length ? (
                inventory.movements.data.items.map((m) => (
                  <div
                    className="flex justify-between gap-4 border-b border-border py-3"
                    key={m.id}
                  >
                    <div>
                      <p className="text-body-sm">
                        {m.kindLabel} · {m.reason}
                      </p>
                      <p className="text-caption text-muted-foreground">
                        {m.createdLabel}
                      </p>
                    </div>
                    <strong className="tabular-nums">
                      {m.quantity > 0 ? "+" : ""}
                      {m.quantity}
                    </strong>
                  </div>
                ))
              ) : (
                <p className="text-body-sm text-soft-foreground">
                  입출고 이력이 없습니다.
                </p>
              )}
            </QueryMessage>
          </section>
        </DialogContent>
      </Dialog>
    </>
  );
}
