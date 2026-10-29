import { model, query, keepPreviousData } from "@comwit/state";
import { adminNotices as api } from "@/services/admin/api/notices";
import { emptyPage, type NoticeInput, type NoticeView } from "@/lib/course";
import type { Pageable } from "@/server/repository/types";
import type { DomainState, ListArgs } from "./types";
export const freshDraft = (): NoticeInput => ({
  title: "",
  content: "",
  pinned: false,
  status: "draft",
});
export const domain = model<DomainState>({
  list: query<Pageable<NoticeView>, ListArgs>({
    initialData: emptyPage<NoticeView>(),
    queryFn: (arg) => api.findAll(arg.filter, arg.pageable),
    placeholderData: keepPreviousData,
  }),
  filter: { search: "", status: "" },
  page: 1,
  draft: freshDraft(),
  editorOpen: false,
  isSaving: false,
  error: null,
});
