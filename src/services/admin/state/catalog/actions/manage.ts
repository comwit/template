import { action } from "@comwit/state";
import { adminCatalog } from "@/services/admin/api/catalog";
import { mutate } from "@/lib/commerce-state";
import { popup } from "@/lib/popup";
import type { ImageAsset } from "@/lib/image";
import type { ProductInput, ListFilter, CategoryInput } from "@/lib/commerce";
import type { CatalogActions } from "../types";
import { catalog, freshDraft } from "../model";
export const manageActions = action<CatalogActions>(({ state }) => {
  class ManageActions {
    private model = state(catalog);
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
    openNew() {
      this.model.draft = freshDraft();
      this.model.error = null;
      this.model.editorOpen = true;
    }
    close() {
      if (!this.model.isSaving) this.model.editorOpen = false;
    }
    setDraft(draft: ProductInput) {
      this.model.draft = draft;
    }
    addSku() {
      this.model.draft.skus.push({
        code: "",
        options: [],
        price: 0,
        active: true,
      });
    }
    removeSku(index: number) {
      if (this.model.draft.skus.length > 1)
        this.model.draft.skus.splice(index, 1);
    }
    addImage(image: ImageAsset) {
      this.model.draft.images.push(image);
    }
    removeImage(index: number) {
      this.model.draft.images.splice(index, 1);
    }
    async edit(id: string) {
      await mutate(this.model, async () => {
        const product = await adminCatalog.find(id);
        this.model.draft = {
          id: product.id,
          name: product.name,
          slug: product.slug,
          categoryId: product.categoryId,
          description: product.description,
          status: product.status,
          images: product.images,
          skus: product.skus.map((s) => ({
            id: s.id,
            code: s.code,
            options: s.options,
            price: s.price,
            active: s.active,
          })),
        };
        this.model.editorOpen = true;
      });
    }
    async save() {
      await mutate(
        this.model,
        async () => {
          await adminCatalog.save(this.model.draft);
          this.model.editorOpen = false;
          await this.refresh();
        },
        "상품을 저장했습니다.",
      );
    }
    async archive(id: string) {
      if (
        !(await popup.confirm({
          title: "판매를 중지할까요?",
          description: "기존 주문내역은 유지됩니다.",
        }))
      )
        return;
      await mutate(
        this.model,
        async () => {
          await adminCatalog.archive(id);
          await this.refresh();
        },
        "판매를 중지했습니다.",
      );
    }
    async saveCategory(input: CategoryInput) {
      await mutate(
        this.model,
        async () => {
          await adminCatalog.saveCategory(input);
          await this.model.categories.refetch();
        },
        "카테고리를 저장했습니다.",
      );
    }
  }
  return new ManageActions();
});
