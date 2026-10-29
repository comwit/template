import { model, query, keepPreviousData } from "@comwit/state";
import { content as api } from "@/services/app/api/content";
import { emptyPage, type NoticeView, type BannerView } from "@/lib/course";
import type { Pageable } from "@/server/repository/types";
import type { DomainState } from "./types";
export const domain = model<DomainState>({
  notices: query<Pageable<NoticeView>, { page: number }>({
    initialData: emptyPage<NoticeView>(),
    queryFn: ({ page }) => api.notices({ page, limit: 20 }),
    placeholderData: keepPreviousData,
  }),
  page: 1,
  notice: query<NoticeView | null, string>({
    initialData: null,
    queryFn: (id) => api.notice(id),
  }),
  banners: query<BannerView[]>({
    initialData: [],
    queryFn: () => api.banners(),
  }),
});
