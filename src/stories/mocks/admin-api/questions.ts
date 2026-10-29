import type { AdminQuestionsAPI } from "@/services/admin/api/questions";
import { findItem, list, mockApi } from "../runtime";
import { nowLabel, statusLabel } from "../labels";
export const adminQuestions = {
  findAll: mockApi<AdminQuestionsAPI["findAll"]>((db, filter, page) =>
    list(db.questions, filter, page),
  ),
  find: mockApi<AdminQuestionsAPI["find"]>((db, id) =>
    findItem(db.questions, id),
  ),
  answer: mockApi<AdminQuestionsAPI["answer"]>((db, input) => {
    const question = findItem(db.questions, input.questionId);
    const id = crypto.randomUUID();
    question.comments.push({
      id,
      questionId: question.id,
      authorType: "admin",
      authorName: db.adminUser?.name ?? "운영자",
      content: input.content,
      isAnswer: true,
      createdLabel: nowLabel(),
    });
    question.commentCount = question.comments.length;
    if (question.status === "open") {
      question.status = "answered";
      question.statusLabel = statusLabel("answered");
    }
    return id;
  }),
  setStatus: mockApi<AdminQuestionsAPI["setStatus"]>((db, input) => {
    const question = findItem(db.questions, input.questionId);
    if (input.status) {
      question.status = input.status;
      question.statusLabel = statusLabel(input.status);
    }
    if (input.pinned !== undefined) question.pinned = input.pinned;
  }),
} satisfies AdminQuestionsAPI;
