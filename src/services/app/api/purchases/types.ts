import type * as Types from "@/lib/course";
import type { PageRequest, Pageable } from "@/server/repository/types";
export type * from "@/lib/course";
export interface PurchasesAPI {
  findAll(pageable: PageRequest): Promise<Pageable<Types.PurchaseView>>;
  downloadLink(fileId: string): Promise<Types.DownloadLinkView>;
}
