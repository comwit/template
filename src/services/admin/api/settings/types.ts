import type * as Types from "@/lib/course";
export type * from "@/lib/course";
export interface AdminSettingsAPI {
  find(): Promise<Types.SettingsView>;
}
