"use client";
import { useAdminQuestions } from "@/services/admin/state/questions";
import { QuestionsSection } from "./questions-section";
import { QuestionDetails } from "./question-details";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/lib/components/ui/dialog";
import { QueryMessage } from "@/services/admin/_components/course";
export function QuestionsContent() {
  const questions = useAdminQuestions((s) => ({
    list: s.list.load({
      filter: s.filter,
      pageable: { page: s.page, limit: 20 },
    }),
    detail: s.selectedId ? s.detail.load(s.selectedId) : s.detail,
    selectedId: s.selectedId,
    filter: s.filter,
    busy: s.isSaving,
    error: s.error,
    actions: s.actions,
  }));
  return (
    <>
      <QuestionsSection
        query={questions.list}
        filter={questions.filter}
        onFilter={questions.actions.setFilter}
        onPage={questions.actions.setPage}
        onRefresh={() => void questions.actions.refresh()}
        onSelect={questions.actions.select}
      />
      <Dialog
        open={Boolean(questions.selectedId)}
        onOpenChange={(open) => {
          if (!open) questions.actions.select(null);
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>질문 상세</DialogTitle>
            <DialogDescription className="sr-only">
              질문 내용과 댓글을 확인하고 답변을 등록합니다.
            </DialogDescription>
          </DialogHeader>
          <QueryMessage
            isError={questions.detail.isError}
            isLoading={questions.detail.isLoading || !questions.detail.isSuccess}
            error={questions.detail.error}
            onRetry={() => void questions.actions.refresh()}
          >
            {questions.detail.data ? (
              <QuestionDetails
                key={questions.detail.data.id}
                question={questions.detail.data}
                busy={questions.busy}
                error={questions.error}
                onAnswer={(content) =>
                  questions.actions.answer(questions.detail.data!.id, content)
                }
                onPinned={(pinned) =>
                  void questions.actions.setPinned(
                    questions.detail.data!.id,
                    pinned,
                  )
                }
                onStatus={(status) =>
                  void questions.actions.setStatus(
                    questions.detail.data!.id,
                    status,
                  )
                }
              />
            ) : null}
          </QueryMessage>
        </DialogContent>
      </Dialog>
    </>
  );
}
