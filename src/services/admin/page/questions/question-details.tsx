"use client";
import { useState } from "react";
import { Pin, PinOff, Lock, LockOpen, Send } from "lucide-react";
import { Button } from "@/lib/components/ui/button";
import { Alert } from "@/lib/components/ui/alert";
import { Badge } from "@/lib/components/ui/badge";
import { Editor } from "@/lib/components/ui/editor";
import { StatusBadge } from "@/services/admin/_components/course";
import type { QuestionView } from "@/lib/course";
const isBlankHtml = (html: string) =>
  !html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim() &&
  !/<img\b/i.test(html);
export function QuestionDetails(props: {
  question: QuestionView;
  busy: boolean;
  error: string | null;
  onAnswer(content: string): Promise<boolean>;
  onPinned(pinned: boolean): void;
  onStatus(status: QuestionView["status"]): void;
}) {
  const q = props.question;
  const [content, setContent] = useState("");
  const [editorKey, setEditorKey] = useState(0);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1.5">
          <p className="text-title-md">{q.title}</p>
          <p className="text-caption text-muted-foreground">
            {q.courseTitle}
            {q.lessonTitle ? ` · ${q.lessonTitle}` : ""} · {q.userName} ·{" "}
            {q.createdLabel}
          </p>
          <div className="flex flex-wrap gap-1.5">
            <StatusBadge status={q.status} label={q.statusLabel} />
            {q.pinned ? (
              <Badge variant="info">
                <Pin aria-hidden="true" />
                고정
              </Badge>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={props.busy}
            onClick={() => props.onPinned(!q.pinned)}
          >
            {q.pinned ? (
              <PinOff className="size-4" aria-hidden="true" />
            ) : (
              <Pin className="size-4" aria-hidden="true" />
            )}
            {q.pinned ? "고정 해제" : "고정"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={props.busy}
            onClick={() =>
              props.onStatus(q.status === "closed" ? "open" : "closed")
            }
          >
            {q.status === "closed" ? (
              <LockOpen className="size-4" aria-hidden="true" />
            ) : (
              <Lock className="size-4" aria-hidden="true" />
            )}
            {q.status === "closed" ? "다시 열기" : "닫기"}
          </Button>
        </div>
      </div>
      <div
        className="prose prose-sm max-w-none rounded-control bg-secondary px-4 py-3 text-body-sm text-soft-foreground [&_img]:max-w-full"
        dangerouslySetInnerHTML={{ __html: q.content }}
      />
      <section className="space-y-2">
        <h3 className="text-title-sm">
          댓글{" "}
          <span className="text-caption text-muted-foreground">
            {q.comments.length}
          </span>
        </h3>
        {q.comments.length ? (
          <div className="divide-y divide-border">
            {q.comments.map((c) => (
              <div
                key={c.id}
                className={`space-y-1 py-3 ${c.authorType === "admin" ? "border-l-2 border-primary pl-3" : ""}`}
              >
                <p className="flex items-center gap-2 text-caption text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {c.authorName}
                  </span>
                  {c.authorType === "admin" ? (
                    <Badge variant="info">답변</Badge>
                  ) : null}
                  <span>{c.createdLabel}</span>
                </p>
                <div
                  className="prose prose-sm max-w-none text-body-sm text-soft-foreground [&_img]:max-w-full"
                  dangerouslySetInnerHTML={{ __html: c.content }}
                />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-body-sm text-soft-foreground">
            아직 댓글이 없습니다.
          </p>
        )}
      </section>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (isBlankHtml(content)) return;
          void props.onAnswer(content).then((ok) => {
            if (!ok) return;
            setContent("");
            setEditorKey((k) => k + 1);
          });
        }}
      >
        <h3 className="text-title-sm">답변 작성</h3>
        <Editor
          key={editorKey}
          value={content}
          onChange={setContent}
          placeholder="수강생에게 보이는 답변을 작성하세요."
          aria-label="답변 내용"
        />
        {props.error ? <Alert tone="destructive">{props.error}</Alert> : null}
        <div className="flex justify-end">
          <Button
            type="submit"
            size="sm"
            disabled={props.busy || isBlankHtml(content)}
          >
            <Send className="size-4" aria-hidden="true" />
            {props.busy ? "등록 중…" : "답변 등록"}
          </Button>
        </div>
      </form>
    </div>
  );
}
