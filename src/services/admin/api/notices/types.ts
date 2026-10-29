import type * as Types from "@/lib/course";
import type { PageRequest, Pageable } from "@/server/repository/types";
export type * from "@/lib/course";
export interface AdminNoticesAPI {
  findAll(filter: Types.ListFilter, pageable: PageRequest): Promise<Pageable<Types.NoticeView>>;
  find(id: string): Promise<Types.NoticeView>;
  save(request: Types.NoticeInput): Promise<string>;
  remove(id: string): Promise<void>;
}
