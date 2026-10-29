import type { Query } from "@comwit/state";
import type { SettingsView } from "@/lib/course";
export type * from "@/lib/course";
export type DomainState = { data: Query<SettingsView | null> };
export type DomainActions = { refresh(): Promise<void> };
