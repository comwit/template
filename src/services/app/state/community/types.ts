import type { ReviewInput, QuestionInput, CommentInput } from "@/lib/course";
export type * from "@/lib/course";
export type DomainState = {
  isSaving: boolean;
  error: string | null;
};
/** 성공하면 생성된 id, 실패(오류는 state.error·토스트)면 null. 목록 재조회는 페이지가 catalog 액션으로 한다. */
export type DomainActions = {
  writeReview(input: ReviewInput): Promise<string | null>;
  askQuestion(input: QuestionInput): Promise<string | null>;
  comment(input: CommentInput): Promise<string | null>;
};
