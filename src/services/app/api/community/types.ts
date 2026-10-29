import type * as Types from "@/lib/course";
export type * from "@/lib/course";
export interface CommunityAPI {
  writeReview(request: Types.ReviewInput): Promise<string>;
  askQuestion(request: Types.QuestionInput): Promise<string>;
  comment(request: Types.CommentInput): Promise<string>;
}
