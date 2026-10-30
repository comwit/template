import { model, query, keepPreviousData } from "@comwit/state";
import { catalog as api } from "@/services/app/api/catalog";
import {
  emptyPage,
  type CourseSummary,
  type CourseDetail,
  type CategoryView,
  type ReviewView,
  type QuestionView,
  type ProductSummary,
  type ProductDetail,
} from "@/lib/course";
import type { Pageable } from "@/server/repository/types";
import type {
  DomainState,
  ListArgs,
  ProductListArgs,
  ReviewArgs,
  QuestionArgs,
} from "./types";
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
  detail: query<CourseDetail | null, string>({
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
  products: query<Pageable<ProductSummary>, ProductListArgs>({
    initialData: emptyPage<ProductSummary>(),
    queryFn: (arg) => api.products(arg.filter, arg.pageable),
    placeholderData: keepPreviousData,
  }),
  productFilter: { search: "", category: "", kind: "", sort: "latest" },
  productPage: 1,
  product: query<ProductDetail | null, string>({
    initialData: null,
    queryFn: (id) => api.product(id),
  }),
});
