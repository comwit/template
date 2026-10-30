import { action } from "@comwit/state";
import type {
  CourseFilter,
  CourseSummary,
  ProductFilter,
  ProductSummary,
} from "@/lib/course";
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
    /**
     * 카드 → 상세 소프트 내비 직전에 호출한다(`<Link onClick={() => actions.open(course)}>`).
     * 목록 항목(CourseSummary)을 detail 리소스에 그대로 넣는다. 상세 전용 필드(소개·강사·커리큘럼·수강 여부)는
     * 비워 두지 않고 `undefined` 로 남겨, 화면이 그 부분만 스켈레톤으로 그리게 한다. 인터셉트 라우트의
     * `.suspend(id)` 는 이 값으로 바로 그리고, 커밋 뒤 백그라운드 재조회가 나머지를 채운다.
     * `.set()` 은 병합하지 않으므로, 방금 본 같은 강의를 다시 열 때는 이미 받은 상세 필드를 지키고 목록 값만 덮는다.
     */
    open(course: CourseSummary) {
      const current = this.model.detail.data;
      this.model.detail.set(
        current?.id === course.id ? { ...current, ...course } : course,
        { arg: course.id },
      );
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
    /** 상품 카드 → 상세. open() 과 같은 규칙: 목록 항목만 넣고 상세 전용 필드(소개·파일·포함 강의·구매 여부)는 응답 전까지 `undefined`. */
    openProduct(product: ProductSummary) {
      const current = this.model.product.data;
      this.model.product.set(
        current?.id === product.id ? { ...current, ...product } : product,
        { arg: product.id },
      );
    }
  }
  return new ManageActions();
});
