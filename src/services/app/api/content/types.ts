import type * as Types from "@/lib/course";
import type { PageRequest, Pageable } from "@/server/repository/types";
export type * from "@/lib/course";
export interface ContentAPI {
  notices(pageable: PageRequest): Promise<Pageable<Types.NoticeView>>;
  notice(id: string): Promise<Types.NoticeView>;
  banners(): Promise<Types.BannerView[]>;
}
