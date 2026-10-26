import type { Query } from "@comwit/state";
import type { DashboardView } from "@/lib/commerce";
export type * from "@/lib/commerce";
export type DomainState = { data: Query<DashboardView | null> };
export type DomainActions = { refresh(): Promise<void> };
