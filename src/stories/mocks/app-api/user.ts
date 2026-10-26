import type { UserAPI } from "@/services/app/api/user";
import { mockApi } from "../runtime";
export const user = {
  getMe: mockApi<UserAPI["getMe"]>((db) => db.appUser),
} satisfies UserAPI;
