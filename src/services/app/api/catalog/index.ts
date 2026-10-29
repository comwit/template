import { resolveActions } from "@/lib/utils";
export * from "./types";
import { findAll } from "./actions/find-all";
import { find } from "./actions/find";
import { categories } from "./actions/categories";
import { reviews } from "./actions/reviews";
import { questions } from "./actions/questions";
import { question } from "./actions/question";
export const catalog = resolveActions({ findAll, find, categories, reviews, questions, question });
