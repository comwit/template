import { action } from "@comwit/state";
import type { CourseFilter, ProductFilter } from "@/lib/course";
import type { DomainActions } from "../types";
import { domain } from "../model";
export const manageActions = action<DomainActions>(({ state }) => {
  class ManageActions {
    private model = state(domain);
    setFilter(filter: Partial<CourseFilter>) {
      this.model.filter = { ...this.model.filter, ...filter };
      this.model.page = 1;
    }
    setPage(page: number) {
      this.model.page = page;
    }
    async refresh() {
      await this.model.list.refetch();
    }
    // 상세 캐시를 손으로 채우는 액션은 없다. 목록 → 상세의 첫 화면은 모델의 `seed` 가 그린다(model.ts).
    // 상세 전용 데이터를 seed 만 있는 키에 써 넣지 않는다 — 전체 응답이 오면 어차피 seed 를 덮는다.
    async refreshDetail() {
      await this.model.detail.refetch();
    }
    async refreshReviews() {
      await this.model.reviews.refetch();
    }
    async refreshQuestions() {
      await this.model.questions.refetch();
    }
    async refreshQuestion() {
      await this.model.question.refetch();
    }
    setProductFilter(filter: Partial<ProductFilter>) {
      this.model.productFilter = { ...this.model.productFilter, ...filter };
      this.model.productPage = 1;
    }
    setProductPage(page: number) {
      this.model.productPage = page;
    }
    async refreshProduct() {
      await this.model.product.refetch();
    }
  }
  return new ManageActions();
});
