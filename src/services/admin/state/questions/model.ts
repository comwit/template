import { model, query, keepPreviousData } from "@comwit/state";
import { adminQuestions as api } from "@/services/admin/api/questions";
import { emptyPage, type QuestionView } from "@/lib/course";
import type { Pageable } from "@/server/repository/types";
import type { DomainState, ListArgs } from "./types";
export const domain = model<DomainState>({
  list: query<Pageable<QuestionView>, ListArgs>({
    initialData: emptyPage<QuestionView>(),
    queryFn: (arg) => api.findAll(arg.filter, arg.pageable),
    placeholderData: keepPreviousData,
  }),
  filter: { search: "", status: "" },
  page: 1,
  selectedId: null,
  detail: query<QuestionView | null, string>({
    initialData: null,
    queryFn: (id) => api.find(id),
  }),
  isSaving: false,
  error: null,
});
