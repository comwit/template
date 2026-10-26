import type { AdminUserAPI } from "@/services/admin/api/user";
import { mockApi } from "../runtime";
export const adminUser = {
  getMe: mockApi<AdminUserAPI["getMe"]>((db) => db.adminUser),
} satisfies AdminUserAPI;
