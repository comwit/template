"use client";
import { CheckCircle2, Circle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/lib/components/ui/dialog";
import { EmptyState } from "@/lib/components/ui/empty-state";
import { QueryMessage, DateValue } from "@/services/admin/_components/course";
import { formatDuration } from "@/lib/course";
import type { ProgressDetailView } from "@/services/admin/state/students";
export function ProgressDialog(props: {
  open: boolean;
  query: {
    data: ProgressDetailView[];
    isLoading: boolean;
    isSuccess: boolean;
    isError: boolean;
    error: unknown;
  };
  onOpenChange(open: boolean): void;
  onRetry(): void;
}) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>레슨별 진도</DialogTitle>
          <DialogDescription className="sr-only">
            수강생이 시청한 레슨과 마지막 위치입니다.
          </DialogDescription>
        </DialogHeader>
        <QueryMessage
          isError={props.query.isError}
          isLoading={props.query.isLoading || !props.query.isSuccess}
          error={props.query.error}
          onRetry={props.onRetry}
        >
          {props.query.data.length === 0 ? (
            <EmptyState title="아직 시청 기록이 없습니다" />
          ) : (
            <ul className="divide-y divide-border">
              {props.query.data.map((p) => (
                <li
                  key={p.lessonId}
                  className="flex items-center gap-3 py-2 text-body-sm"
                >
                  {p.completed ? (
                    <CheckCircle2
                      className="size-4 shrink-0 text-success"
                      aria-label="완료"
                    />
                  ) : (
                    <Circle
                      className="size-4 shrink-0 text-muted-foreground"
                      aria-label="진행 중"
                    />
                  )}
                  <span className="min-w-0 flex-1 truncate">{p.lessonTitle}</span>
                  <span className="whitespace-nowrap tabular-nums text-muted-foreground">
                    {formatDuration(p.positionSeconds)}
                  </span>
                  <DateValue value={p.updatedLabel} />
                </li>
              ))}
            </ul>
          )}
        </QueryMessage>
      </DialogContent>
    </Dialog>
  );
}
