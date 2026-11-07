import {
  model,
  query,
  keepPreviousData,
  type QuerySeedContext,
} from "@comwit/state";
import { catalog as api } from "@/services/app/api/catalog";
import {
  emptyPage,
  type CourseSummary,
  type CourseView,
  type CategoryView,
  type ReviewView,
  type QuestionView,
  type ProductSummary,
  type ProductView,
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
  // 상세의 seed 는 같은 모델의 목록 항목이다. 목록에서 들어오면 `.suspend(id)` 가 기다리지 않고 그 항목을
  // 바로 그리고(`isPartial: true`) 커밋 뒤 전체를 받는다. 목록에 없으면 undefined → 평소처럼 suspend.
  // queryFn 은 없는·비공개 강의에 null 을 돌려주므로 화면은 `data === null` 을 "없음"으로 그린다.
  detail: query<CourseView | null, string, CourseSummary>({
    initialData: null,
    queryFn: (id) => api.find(id),
    seed: (id, { state }: QuerySeedContext<DomainState>) =>
      state.list.data.items.find((course) => course.id === id),
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
  product: query<ProductView | null, string, ProductSummary>({
    initialData: null,
    queryFn: (id) => api.product(id),
    seed: (id, { state }: QuerySeedContext<DomainState>) =>
      state.products.data.items.find((product) => product.id === id),
  }),
});
