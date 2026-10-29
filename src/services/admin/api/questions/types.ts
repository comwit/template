import type * as Types from "@/lib/course";
import type { PageRequest, Pageable } from "@/server/repository/types";
export type * from "@/lib/course";
export interface AdminQuestionsAPI {
  findAll(filter: Types.ListFilter, pageable: PageRequest): Promise<Pageable<Types.QuestionView>>;
  find(id: string): Promise<Types.QuestionView>;
  answer(request: Types.CommentInput): Promise<string>;
  setStatus(request: Types.QuestionStatusInput): Promise<void>;
}
