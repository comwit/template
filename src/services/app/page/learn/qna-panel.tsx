"use client";

import { useState } from "react";
import { useCatalog } from "@/services/app/state/catalog";
import { useCommunity } from "@/services/app/state/community";
import { courseText } from "@/lib/ui-text";
import { Button } from "@/lib/components/ui/button";
import { Input } from "@/lib/components/ui/input";
import { Editor } from "@/lib/components/ui/editor";
import { Pager } from "@/lib/components/ui/pager";

// 읽는 상태: useCatalog questions(.load({ courseId, lessonId, page })), question(펼친 질문만 .load(id)) / useCommunity isSaving.
// 액션: askQuestion·comment 성공 뒤 catalog.actions.refreshQuestions/refreshQuestion 으로 목록·상세를 다시 받는다.
export function QnaPanel({
  courseId,
  lessonId,
}: {
  courseId: string;
  lessonId: string | null;
}) {
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [askKey, setAskKey] = useState(0);
  const [comment, setComment] = useState("");
  const [commentKey, setCommentKey] = useState(0);
  const catalog = useCatalog((state) => ({
    questions: state.questions.load({ courseId, lessonId, page }),
    question: expandedId ? state.question.load(expandedId) : state.question,
    actions: state.actions,
  }));
  const community = useCommunity((state) => ({
    isSaving: state.isSaving,
    actions: state.actions,
  }));
  const questions = catalog.questions;
  const expanded =
    expandedId && catalog.question.data?.id === expandedId
      ? catalog.question.data
      : null;

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-title-lg">
        {courseText.questions}
        <span className="ml-2 text-body-sm text-muted-foreground">
          {questions.data.total}
        </span>
      </h2>

      <div className="flex max-w-2xl flex-col gap-2">
        <Input
          placeholder="질문 제목 (2자 이상)"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
        <Editor
          key={askKey}
          value={content}
          onChange={setContent}
          placeholder="궁금한 점을 적어주세요."
          aria-label="질문 내용"
        />
        <Button
          type="button"
          className="w-fit"
          disabled={community.isSaving || title.trim().length < 2 || !content.trim()}
          onClick={async () => {
            const id = await community.actions.askQuestion({
              courseId,
              lessonId,
              title: title.trim(),
              content,
            });
            if (!id) return;
            setTitle("");
            setContent("");
            setAskKey((key) => key + 1);
            await catalog.actions.refreshQuestions();
          }}
        >
          질문하기
        </Button>
      </div>

      {questions.isError ? (
        <p className="text-body-sm text-destructive">{questions.error}</p>
      ) : questions.isLoading ? (
        <p className="text-body-sm text-muted-foreground">{courseText.loading}</p>
      ) : questions.data.items.length === 0 ? (
        <p className="text-body-sm text-muted-foreground">{courseText.empty}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {questions.data.items.map((question) => (
            <li key={question.id}>
              <Button
                type="button"
                variant="plain"
                size="none"
                className="text-left"
                onClick={() =>
                  setExpandedId(expandedId === question.id ? null : question.id)
                }
              >
                <span className="text-title-sm">
                  {question.pinned ? "[고정] " : ""}
                  {question.title}
                </span>
                <span className="ml-2 text-body-sm text-muted-foreground">
                  {question.statusLabel} · {question.userName} ·{" "}
                  {question.createdLabel} · 댓글 {question.commentCount}
                </span>
              </Button>
              {expandedId === question.id ? (
                <div className="mt-2 flex flex-col gap-2 pl-4">
                  {catalog.question.isError ? (
                    <p className="text-body-sm text-destructive">
                      {catalog.question.error}
                    </p>
                  ) : !expanded ? (
                    <p className="text-body-sm text-muted-foreground">
                      {courseText.loading}
                    </p>
                  ) : (
                    <>
                      <div
                        className="text-body"
                        dangerouslySetInnerHTML={{ __html: expanded.content }}
                      />
                      <ul className="flex flex-col gap-2">
                        {expanded.comments.map((entry) => (
                          <li key={entry.id}>
                            <p className="text-body-sm text-muted-foreground">
                              {entry.authorType === "admin" ? "[운영자] " : ""}
                              {entry.authorName} · {entry.createdLabel}
                              {entry.isAnswer ? " · 답변" : ""}
                            </p>
                            <div
                              className="text-body"
                              dangerouslySetInnerHTML={{ __html: entry.content }}
                            />
                          </li>
                        ))}
                      </ul>
                      <Editor
                        key={`${expanded.id}-${commentKey}`}
                        value={comment}
                        onChange={setComment}
                        placeholder="댓글을 남겨주세요."
                        aria-label="댓글 내용"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="w-fit"
                        disabled={community.isSaving || !comment.trim()}
                        onClick={async () => {
                          const id = await community.actions.comment({
                            questionId: expanded.id,
                            content: comment,
                          });
                          if (!id) return;
                          setComment("");
                          setCommentKey((key) => key + 1);
                          await Promise.all([
                            catalog.actions.refreshQuestion(),
                            catalog.actions.refreshQuestions(),
                          ]);
                        }}
                      >
                        댓글 남기기
                      </Button>
                    </>
                  )}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      <Pager
        page={questions.data.page}
        totalPages={questions.data.totalPages}
        onChange={setPage}
      />
    </section>
  );
}
