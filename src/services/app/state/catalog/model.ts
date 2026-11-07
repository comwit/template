import {
  model,
  query,
  keepPreviousData,
  type QuerySeedContext,
} from "@comwit/state";
import { catalog as api } from "@/services/app/api/catalog";
import {
  emptyPage,
  type ProductView,
  type OrderView,
  type MovementView,
  type CategoryView,
} from "@/lib/commerce";
import type { Pageable } from "@/server/repository/types";
import type { DomainState, ListArgs } from "./types";
export const domain = model<DomainState>({
  list: query<Pageable<ProductView>, ListArgs>({
    initialData: emptyPage<ProductView>(),
    queryFn: (arg) => api.findAll(arg.filter, arg.pageable),
    placeholderData: keepPreviousData,
  }),
  filter: { search: "", status: "" },
  page: 1,
  isSaving: false,
  error: null,
  // 상세는 자기 모델의 목록에서 seed 를 선언한다(state.ai.md → Detail seed). 목록 항목이 곧 상세(같은 presentProduct)라
  // 목록에서 넘어온 `.suspend(id)` 는 기다리지 않고 그 항목을 그리고, 커밋 뒤 전체 상세를 다시 받아 최신 재고로 올라간다.
  // 직접 진입은 seed 가 없어 그대로 suspend → SSR. 없는 상품은 queryFn 이 null 을 돌려준다(오류가 아니다).
  detail: query<ProductView | null, string, ProductView>({
    initialData: null,
    queryFn: (id) => api.find(id),
    seed: (id, { state }: QuerySeedContext<DomainState>) =>
      state.list.data.items.find((product) => product.id === id),
  }),
  categories: query<CategoryView[]>({
    initialData: [],
    queryFn: () => api.categories(),
  }),
});
