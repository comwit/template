import type * as Types from "@/lib/course";
import type { PageRequest, Pageable } from "@/server/repository/types";
export type * from "@/lib/course";
export interface AdminLeadsAPI {
  findAll(filter: Types.ListFilter, pageable: PageRequest): Promise<Pageable<Types.LeadView>>;
}
