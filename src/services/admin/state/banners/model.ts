import { model, query } from "@comwit/state";
import { adminBanners as api } from "@/services/admin/api/banners";
import type { BannerView } from "@/lib/course";
import type { BannerDraft, DomainState } from "./types";
export const freshDraft = (): BannerDraft => ({
  title: "",
  image: null,
  linkUrl: "",
  position: 0,
  active: true,
  startsAt: null,
  endsAt: null,
});
export const domain = model<DomainState>({
  list: query<BannerView[]>({
    initialData: [],
    queryFn: () => api.findAll(),
  }),
  draft: freshDraft(),
  editorOpen: false,
  isSaving: false,
  error: null,
});
