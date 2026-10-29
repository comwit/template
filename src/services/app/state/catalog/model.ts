import { model, query, keepPreviousData } from "@comwit/state";
import { catalog as api } from "@/services/app/api/catalog";
import {
  emptyPage,
  type CourseSummary,
  type CourseView,
  type CategoryView,
  type ReviewView,
  type QuestionView,
} from "@/lib/course";
import type { Pageable } from "@/server/repository/types";
import type { DomainState, ListArgs, ReviewArgs, QuestionArgs } from "./types";
const LIMIT = 20;
export const domain = model<DomainState>({
  list: query<Pageable<CourseSummary>, ListArgs>({
    initialData: emptyPage<CourseSummary>(),
    queryFn: (arg) => api.findAll(arg.filter, arg.pageable),
    placeholderData: keepPreviousData,
  }),
  filter: { search: "", category: "", level: "", sort: "latest" },
  page: 1,
  isSaving: false,
  error: null,
  detail: query<CourseView | null, string>({
    initialData: null,
    queryFn: (id) => api.find(id),
  }),
  categories: query<CategoryView[]>({
    initialData: [],
    queryFn: () => api.categories(),
  }),
  reviews: query<Pageable<ReviewView>, ReviewArgs>({
    initialData: emptyPage<ReviewView>(),
    queryFn: (arg) => api.reviews(arg.courseId, { page: arg.page, limit: LIMIT }),
    placeholderData: keepPreviousData,
  }),
  questions: query<Pageable<QuestionView>, QuestionArgs>({
    initialData: emptyPage<QuestionView>(),
    queryFn: (arg) =>
      api.questions(arg.courseId, arg.lessonId, { page: arg.page, limit: LIMIT }),
    placeholderData: keepPreviousData,
  }),
  question: query<QuestionView | null, string>({
    initialData: null,
    queryFn: (id) => api.question(id),
  }),
});
