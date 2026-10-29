"use client";
import { useState } from "react";
import { Button } from "@/lib/components/ui/button";
import { Textarea } from "@/lib/components/ui/textarea";
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
import { courseText } from "@/lib/ui-text";
import type { ReviewView } from "@/lib/course";
export function ReviewReplyDialog(props: {
  review: ReviewView | null;
  busy: boolean;
  error: string | null;
  onSubmit(reply: string): void;
  onClose(): void;
}) {
  const [reply, setReply] = useState(props.review?.adminReply ?? "");
  const review = props.review;
  return (
    <Dialog
      open={Boolean(review)}
      onOpenChange={(open) => {
        if (!open) props.onClose();
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>수강평 답글</DialogTitle>
          <DialogDescription className="sr-only">
            수강생에게 공개되는 운영자 답글을 작성합니다.
          </DialogDescription>
        </DialogHeader>
        {review ? (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              props.onSubmit(reply);
            }}
          >
            <div className="rounded-control bg-secondary px-3 py-3">
              <p className="text-caption text-muted-foreground">
                {review.courseTitle} · {review.userName} · {review.rating}점 ·{" "}
                {review.createdLabel}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-body-sm text-soft-foreground">
                {review.content}
              </p>
            </div>
            <TextField
              label="답글"
              helperText="비워두고 저장하면 기존 답글이 삭제됩니다."
            >
              <Textarea
                value={reply}
                maxLength={2000}
                onChange={(e) => setReply(e.target.value)}
                autoFocus
              />
            </TextField>
            {props.error ? (
              <Alert tone="destructive">{props.error}</Alert>
            ) : null}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={props.onClose}
                disabled={props.busy}
              >
                {courseText.cancel}
              </Button>
              <Button type="submit" disabled={props.busy}>
                {props.busy ? "저장 중…" : courseText.save}
              </Button>
            </DialogFooter>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
