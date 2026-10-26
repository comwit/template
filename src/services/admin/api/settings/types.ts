import type * as Types from "@/lib/commerce";
import type { PageRequest, Pageable } from "@/server/repository/types";
export type * from "@/lib/commerce";
export interface AdminSettingsAPI {
  find(): Promise<Types.SettingsView>;
}
