import { action } from "@comwit/state";
import type {
  CourseFilter,
  CourseSummary,
  CourseView,
  ProductFilter,
  ProductSummary,
  ProductView,
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
     * 목록 항목(CourseSummary)에 상세 전용 필드를 비워 채워 두면 인터셉트 라우트의 `.suspend(id)` 가
     * 기다리지 않고 바로 그리고, 커밋 뒤 백그라운드 재조회가 커리큘럼·강사·수강 여부를 채운다.
     */
    open(course: CourseSummary) {
      const seed: CourseView = {
        ...course,
        description: "",
        instructor: null,
        sections: [],
        enrollment: null,
      };
      this.model.detail.set(seed, { arg: course.id });
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
    /** 상품 카드 → 상세. 목록 항목에 상세 전용 필드를 비워 채워 `.suspend(id)` 가 바로 그리고 뒤에서 재조회한다. */
    openProduct(product: ProductSummary) {
      const seed: ProductView = {
        ...product,
        description: "",
        files: [],
        courses: [],
        purchase: null,
      };
      this.model.product.set(seed, { arg: product.id });
    }
  }
  return new ManageActions();
});
