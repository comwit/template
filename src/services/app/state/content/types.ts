import type { Query } from "@comwit/state";
import type { Pageable } from "@/server/repository/types";
import type { NoticeView, BannerView } from "@/lib/course";
export type * from "@/lib/course";
export type DomainState = {
  notices: Query<Pageable<NoticeView>, { page: number }>;
  page: number;
  notice: Query<NoticeView | null, string>;
  banners: Query<BannerView[]>;
};
export type DomainActions = {
  setPage(page: number): void;
  refresh(): Promise<void>;
};
