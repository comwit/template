import type * as Types from "@/lib/course";
import type { PageRequest, Pageable } from "@/server/repository/types";
export type * from "@/lib/course";
export interface AdminCouponsAPI {
  findAll(filter: Types.ListFilter, pageable: PageRequest): Promise<Pageable<Types.CouponView>>;
  save(request: Types.CouponInput): Promise<string>;
  setActive(id: string, active: boolean): Promise<void>;
}
