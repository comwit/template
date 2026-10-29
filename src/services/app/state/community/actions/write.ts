import { action } from "@comwit/state";
import { community as api } from "@/services/app/api/community";
import { mutate } from "@/lib/course-state";
import type { ReviewInput, QuestionInput, CommentInput } from "@/lib/course";
import type { DomainActions } from "../types";
import { domain } from "../model";
export const writeActions = action<DomainActions>(({ state }) => {
  class WriteActions {
    private model = state(domain);
    async writeReview(input: ReviewInput): Promise<string | null> {
      let id: string | null = null;
      await mutate(
        this.model,
        async () => {
          id = await api.writeReview(input);
        },
        "수강평을 남겼습니다.",
      );
      return id;
    }
    async askQuestion(input: QuestionInput): Promise<string | null> {
      let id: string | null = null;
      await mutate(
        this.model,
        async () => {
          id = await api.askQuestion(input);
        },
        "질문을 등록했습니다.",
      );
      return id;
    }
    async comment(input: CommentInput): Promise<string | null> {
      let id: string | null = null;
      await mutate(
        this.model,
        async () => {
          id = await api.comment(input);
        },
        "댓글을 남겼습니다.",
      );
      return id;
    }
  }
  return new WriteActions();
});
