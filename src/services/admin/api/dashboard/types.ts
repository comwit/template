import type * as Types from "@/lib/course";
export type * from "@/lib/course";
export interface AdminDashboardAPI {
  summary(): Promise<Types.DashboardView>;
}
