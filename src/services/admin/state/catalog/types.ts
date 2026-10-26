import type { Query } from "@comwit/state";
import type { PageRequest, Pageable } from "@/server/repository/types";
import type {
  ProductInput,
  ProductView,
  CategoryView,
  CategoryInput,
  ListFilter,
} from "@/lib/commerce";
import type { ImageAsset } from "@/lib/image";
export type * from "@/lib/commerce";
export type ListArgs = { filter: ListFilter; pageable: PageRequest };
export type CatalogState = {
  list: Query<Pageable<ProductView>, ListArgs>;
  categories: Query<CategoryView[]>;
  filter: ListFilter;
  page: number;
  draft: ProductInput;
  editorOpen: boolean;
  isSaving: boolean;
  error: string | null;
};
export type CatalogActions = {
  setFilter(filter: Partial<ListFilter>): void;
  setPage(page: number): void;
  refresh(): Promise<void>;
  openNew(): void;
  edit(id: string): Promise<void>;
  close(): void;
  setDraft(draft: ProductInput): void;
  addSku(): void;
  removeSku(index: number): void;
  addImage(image: ImageAsset): void;
  removeImage(index: number): void;
  save(): Promise<void>;
  archive(id: string): Promise<void>;
  saveCategory(input: CategoryInput): Promise<void>;
};
