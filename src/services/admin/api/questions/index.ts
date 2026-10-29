import { resolveActions } from "@/lib/utils";
export * from "./types";
import { findAll } from "./actions/find-all";
import { find } from "./actions/find";
import { answer } from "./actions/answer";
import { setStatus } from "./actions/set-status";
export const adminQuestions = resolveActions({ findAll, find, answer, setStatus });
