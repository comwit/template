import { resolveActions } from "@/lib/utils";
export * from "./types";
import { writeReview } from "./actions/write-review";
import { askQuestion } from "./actions/ask-question";
import { comment } from "./actions/comment";
export const community = resolveActions({ writeReview, askQuestion, comment });
