import { model, query, keepPreviousData } from "@comwit/state";
import { enrollments as api } from "@/services/app/api/enrollments";
import {
  emptyPage,
  type EnrollmentView,
  type PlayerView,
  type CertificateView,
} from "@/lib/course";
import type { Pageable } from "@/server/repository/types";
import type { DomainState } from "./types";
export const domain = model<DomainState>({
  list: query<Pageable<EnrollmentView>, { page: number }>({
    initialData: emptyPage<EnrollmentView>(),
    queryFn: ({ page }) => api.findAll({ page, limit: 20 }),
    placeholderData: keepPreviousData,
  }),
  page: 1,
  player: query<PlayerView | null, string>({
    initialData: null,
    queryFn: (courseId) => api.player(courseId),
  }),
  certificates: query<CertificateView[]>({
    initialData: [],
    queryFn: () => api.certificates(),
  }),
  certificate: query<CertificateView | null, string>({
    initialData: null,
    queryFn: (id) => api.certificate(id),
  }),
  progress: {},
  isSaving: false,
  error: null,
});
