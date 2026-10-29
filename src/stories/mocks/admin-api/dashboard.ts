import type { AdminDashboardAPI } from "@/services/admin/api/dashboard";
import { mockApi } from "../runtime";
export const adminDashboard = {
  summary: mockApi<AdminDashboardAPI["summary"]>((db) => db.dashboard),
} satisfies AdminDashboardAPI;
