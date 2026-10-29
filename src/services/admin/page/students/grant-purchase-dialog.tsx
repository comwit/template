"use client";
import { useState } from "react";
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
  DialogFooter,
} from "@/lib/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/lib/components/ui/select";
import type {
  ProductSummary,
  GrantPurchaseInput,
} from "@/services/admin/state/students";
export function GrantPurchaseDialog(props: {
  open: boolean;
  products: ProductSummary[];
  busy: boolean;
  error: string | null;
  onOpenChange(open: boolean): void;
  onGrant(input: GrantPurchaseInput): Promise<boolean>;
}) {
  const [productId, setProductId] = useState("");
  const [email, setEmail] = useState("");
  const reset = () => {
    setProductId("");
    setEmail("");
  };
  return (
    <Dialog
      open={props.open}
      onOpenChange={(open) => {
        if (!open) reset();
        props.onOpenChange(open);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>상품 구매 권한 부여</DialogTitle>
          <DialogDescription>
            가입된 회원의 이메일로 결제 없이 자료를 내려받게 합니다.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void props.onGrant({ productId, email }).then((ok) => {
              if (ok) {
                reset();
                props.onOpenChange(false);
              }
            });
          }}
        >
          <TextField label="상품" required>
            <Select value={productId || undefined} onValueChange={setProductId}>
              <SelectTrigger className="w-full" aria-label="상품">
                <SelectValue placeholder="상품 선택" />
              </SelectTrigger>
              <SelectContent>
                {props.products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </TextField>
          <TextField label="회원 이메일" required>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </TextField>
          {props.error ? <Alert tone="destructive">{props.error}</Alert> : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => props.onOpenChange(false)}
              disabled={props.busy}
            >
              취소
            </Button>
            <Button type="submit" disabled={props.busy || !productId}>
              {props.busy ? "처리 중…" : "부여"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
