import { model, query, keepPreviousData } from "@comwit/state";
import { adminProducts } from "@/services/admin/api/products";
import { adminCourses } from "@/services/admin/api/courses";
import {
  emptyPage,
  type ProductInput,
  type ProductSummary,
  type ProductView,
  type CategoryView,
  type CourseSummary,
} from "@/lib/course";
import type { Pageable } from "@/server/repository/types";
import type { DomainState, ListArgs } from "./types";
export const freshDraft = (): ProductInput => ({
  title: "",
  slug: "",
  categoryId: null,
  summary: "",
  description: "",
  thumbnail: null,
  kind: "file",
  price: 0,
  discountPrice: null,
  discountEndsAt: null,
  status: "draft",
  downloadLimit: null,
  fileIds: [],
  courseIds: [],
});
/** ISO → KST 기준 datetime-local 입력값(YYYY-MM-DDTHH:mm) */
const toLocalInput = (iso: string | null): string | null => {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 16);
};
/** 상세 응답을 편집 초안으로 되돌린다. 파일은 완료된 것만 순서대로 둔다. */
export const toDraft = (product: ProductView): ProductInput => ({
  id: product.id,
  title: product.title,
  slug: product.slug,
  categoryId: product.categoryId,
  summary: product.summary,
  description: product.description,
  thumbnail: product.thumbnail,
  kind: product.kind,
  price: product.price,
  discountPrice: product.discountPrice,
  discountEndsAt: toLocalInput(product.discountEndsAt),
  status: product.status,
  downloadLimit: product.downloadLimit,
  fileIds: readyFiles(product).map((f) => f.id),
  courseIds: product.courses.map((c) => c.id),
});
export const readyFiles = (product: ProductView) =>
  product.files
    .filter((f) => f.status === "ready")
    .sort((a, b) => a.position - b.position);
export const domain = model<DomainState>({
  list: query<Pageable<ProductSummary>, ListArgs>({
    initialData: emptyPage<ProductSummary>(),
    queryFn: (args) => adminProducts.findAll(args.filter, args.pageable),
    placeholderData: keepPreviousData,
  }),
  detail: query<ProductView | null, string>({
    initialData: null,
    queryFn: (id) => adminProducts.find(id),
  }),
  categories: query<CategoryView[]>({
    initialData: [],
    queryFn: () => adminCourses.categories(),
  }),
  courses: query<CourseSummary[]>({
    initialData: [],
    queryFn: async () =>
      (
        await adminCourses.findAll(
          { search: "", status: "published" },
          { page: 1, limit: 100 },
        )
      ).items,
  }),
  filter: { search: "", status: "" },
  page: 1,
  draft: freshDraft(),
  files: [],
  editingId: null,
  isUploading: false,
  isSaving: false,
  error: null,
});
