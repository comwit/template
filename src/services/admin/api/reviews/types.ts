import type * as Types from "@/lib/course";
import type { PageRequest, Pageable } from "@/server/repository/types";
export type * from "@/lib/course";
export interface AdminReviewsAPI {
  findAll(filter: Types.ListFilter, pageable: PageRequest): Promise<Pageable<Types.ReviewView>>;
  reply(request: Types.ReviewReplyInput): Promise<void>;
  setVisibility(request: Types.ReviewVisibilityInput): Promise<void>;
}
