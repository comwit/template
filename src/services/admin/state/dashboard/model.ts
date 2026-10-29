import { model, query } from "@comwit/state";
import { adminDashboard } from "@/services/admin/api/dashboard";
import type { DashboardView } from "@/lib/course";
import type { DomainState } from "./types";
export const domain = model<DomainState>({
  data: query<DashboardView | null>({
    initialData: null,
    queryFn: () => adminDashboard.summary(),
  }),
});
