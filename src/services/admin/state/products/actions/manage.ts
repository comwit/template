import { action } from "@comwit/state";
import { adminProducts } from "@/services/admin/api/products";
import { mutate } from "@/lib/course-state";
import { popup } from "@/lib/popup";
import type { ListFilter } from "@/lib/course";
import type { DomainActions } from "../types";
import { domain, freshDraft, toDraft, readyFiles } from "../model";
type ManageActions = Pick<
  DomainActions,
  "setFilter" | "setPage" | "refresh" | "startNew" | "edit" | "save" | "archive"
>;
export const manageActions = action<ManageActions>(({ state }) => {
  class Manage {
    private model = state(domain);
    setFilter(filter: Partial<ListFilter>) {
      this.model.filter = { ...this.model.filter, ...filter };
      this.model.page = 1;
    }
    setPage(page: number) {
      this.model.page = page;
    }
    async refresh() {
      await Promise.all([
        this.model.list.refetch(),
        this.model.categories.refetch(),
      ]);
    }
    /** 파일 업로드가 상품 id 를 요구하므로 먼저 서버 초안을 만든다. mutate 의 isSaving 가드가 중복 호출을 막는다. */
    async startNew() {
      let id: string | null = null;
      await mutate(this.model, async () => {
        this.model.draft = freshDraft();
        this.model.files = [];
        this.model.editingId = null;
        id = await adminProducts.createDraft();
        await this.loadDraft(id);
      });
      return id;
    }
    private async loadDraft(id: string) {
      const product = await adminProducts.find(id);
      this.model.files = readyFiles(product);
      this.model.draft = toDraft(product);
      this.model.editingId = product.id;
    }
    async edit(id: string) {
      await mutate(this.model, () => this.loadDraft(id));
    }
    async save() {
      let saved: string | null = null;
      await mutate(
        this.model,
        async () => {
          const draft = this.model.draft;
          const courseIds = [...draft.courseIds];
          const request = {
            ...draft,
            slug: draft.slug.trim().toLowerCase(),
            discountPrice:
              draft.discountPrice === null || Number.isNaN(draft.discountPrice)
                ? null
                : draft.discountPrice,
            discountEndsAt: draft.discountEndsAt?.trim() ? draft.discountEndsAt : null,
            downloadLimit:
              draft.downloadLimit === null || Number.isNaN(draft.downloadLimit)
                ? null
                : draft.downloadLimit,
            kind: courseIds.length ? ("bundle" as const) : ("file" as const),
            fileIds: this.model.files.map((f) => f.id),
            courseIds,
          };
          saved = await adminProducts.save(request);
          await this.loadDraft(saved);
          await this.model.list.refetch();
        },
        "상품을 저장했습니다.",
      );
      return saved;
    }
    async archive(id: string) {
      if (
        !(await popup.confirm({
          title: "상품을 보관할까요?",
          description: "공개 목록에서 내려가고 기존 구매자의 다운로드는 유지됩니다.",
        }))
      )
        return;
      await mutate(
        this.model,
        async () => {
          await adminProducts.archive(id);
          await this.model.list.refetch();
        },
        "상품을 보관했습니다.",
      );
    }
  }
  return new Manage();
});
