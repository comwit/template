"use client";
import { useState } from "react";
import { Button } from "@/lib/components/ui/button";
import { Alert } from "@/lib/components/ui/alert";
import { Textarea } from "@/lib/components/ui/textarea";
import { TextField } from "@/lib/components/ui/text-field";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/lib/components/ui/dialog";
import type { RefundRequestView } from "@/lib/course";
export function DecisionDialog(props: {
  open: boolean;
  approve: boolean;
  request: RefundRequestView | null;
  busy: boolean;
  error: string | null;
  onConfirm(note: string): void;
  onClose(): void;
}) {
  const [note, setNote] = useState("");
  const r = props.request;
  return (
    <Dialog
      open={props.open}
      onOpenChange={(open) => {
        if (!open) props.onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {props.approve ? "환불 승인" : "환불 거절"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {props.approve
              ? "승인하면 결제가 즉시 취소되고 수강 권한이 회수됩니다."
              : "거절 사유는 수강생에게 표시됩니다."}
          </DialogDescription>
        </DialogHeader>
        {r ? (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              props.onConfirm(note);
            }}
          >
            <div className="space-y-1.5 rounded-control bg-secondary px-3 py-3 text-body-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="truncate font-mono">{r.displayNumber}</span>
                <span className="font-semibold tabular-nums">
                  {r.amountLabel}
                </span>
              </div>
              <p className="truncate text-soft-foreground">{r.courseTitle}</p>
              <p className="truncate text-caption text-muted-foreground">
                {r.customerEmail} · {r.createdLabel}
              </p>
              <p className="whitespace-pre-wrap border-t border-border pt-2">
                {r.reason}
              </p>
            </div>
            <TextField
              label={props.approve ? "처리 메모" : "거절 사유"}
              helperText={
                props.approve
                  ? "승인하면 결제가 즉시 취소됩니다. 잠시 걸릴 수 있습니다."
                  : undefined
              }
            >
              <Textarea
                value={note}
                maxLength={500}
                rows={3}
                onChange={(e) => setNote(e.target.value)}
              />
            </TextField>
            {props.error ? (
              <Alert tone="destructive">{props.error}</Alert>
            ) : null}
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={props.onClose}
                disabled={props.busy}
              >
                취소
              </Button>
              <Button
                type="submit"
                variant={props.approve ? "default" : "destructive"}
                disabled={props.busy}
              >
                {props.busy
                  ? "처리 중…"
                  : props.approve
                    ? `${r.amountLabel} 환불 승인`
                    : "거절"}
              </Button>
            </DialogFooter>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
