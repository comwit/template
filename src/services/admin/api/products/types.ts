import type * as Types from "@/lib/course";
import type { PageRequest, Pageable } from "@/server/repository/types";
export type * from "@/lib/course";
export interface AdminProductsAPI {
  findAll(filter: Types.ListFilter, pageable: PageRequest): Promise<Pageable<Types.ProductSummary>>;
  find(id: string): Promise<Types.ProductView>;
  createDraft(): Promise<string>;
  save(request: Types.ProductInput): Promise<string>;
  archive(id: string): Promise<void>;
  prepareFile(request: Types.ProductFileInput): Promise<Types.FileUploadTicket>;
  completeFile(fileId: string): Promise<Types.ProductFileView>;
  removeFile(fileId: string): Promise<void>;
}
