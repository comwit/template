import { model, query } from "@comwit/state";
import { adminSettings } from "@/services/admin/api/settings";
import type { SettingsView } from "@/lib/course";
import type { DomainState } from "./types";
export const domain = model<DomainState>({
  data: query<SettingsView | null>({
    initialData: null,
    queryFn: () => adminSettings.find(),
  }),
});
