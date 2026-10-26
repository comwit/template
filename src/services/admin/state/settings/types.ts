import type { Query } from "@comwit/state";
import type { SettingsView } from "@/lib/commerce";
export type * from "@/lib/commerce";
export type DomainState = { data: Query<SettingsView | null> };
export type DomainActions = { refresh(): Promise<void> };
