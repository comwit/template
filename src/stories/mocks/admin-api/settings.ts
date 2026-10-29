import type { AdminSettingsAPI } from "@/services/admin/api/settings";
import { mockApi } from "../runtime";
export const adminSettings = {
  find: mockApi<AdminSettingsAPI["find"]>((db) => db.settings),
} satisfies AdminSettingsAPI;
