import type { Query } from "@comwit/state";
import type { PageRequest, Pageable } from "@/server/repository/types";
import type {
  ProductInput,
  ProductSummary,
  ProductView,
  ProductFileView,
  CategoryView,
  CourseSummary,
  ListFilter,
} from "@/lib/course";
import type { ImageAsset } from "@/lib/image";
export type * from "@/lib/course";
export type ListArgs = { filter: ListFilter; pageable: PageRequest };
export type DomainState = {
  list: Query<Pageable<ProductSummary>, ListArgs>;
  detail: Query<ProductView | null, string>;
  categories: Query<CategoryView[]>;
  /** 묶음에 넣을 수 있는 공개 강의 */
  courses: Query<CourseSummary[]>;
  filter: ListFilter;
  page: number;
  draft: ProductInput;
  /** 업로드 완료된 파일(순서대로). save 때 fileIds 로 보낸다. */
  files: ProductFileView[];
  /** 편집 중인 상품 id. 초안 생성 전엔 null */
  editingId: string | null;
  isUploading: boolean;
  isSaving: boolean;
  error: string | null;
};
export type DomainActions = {
  setFilter(filter: Partial<ListFilter>): void;
  setPage(page: number): void;
  refresh(): Promise<void>;
  /** 서버에 초안을 만들고 id 를 돌려준다. 실패 시 null */
  startNew(): Promise<string | null>;
  edit(id: string): Promise<void>;
  updateDraft(patch: Partial<ProductInput>): void;
  /** 파일 업로드 (presign → PUT → complete). 성공 시 목록 끝에 붙는다. */
  uploadFile(file: File): Promise<void>;
  removeFile(fileId: string): Promise<void>;
  moveFile(index: number, direction: -1 | 1): void;
  setCourses(ids: string[]): void;
  setThumbnail(image: ImageAsset | null): void;
  /** 저장 성공 시 상품 id, 실패 시 null */
  save(): Promise<string | null>;
  archive(id: string): Promise<void>;
};
