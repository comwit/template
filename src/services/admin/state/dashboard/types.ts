import type { Query } from "@comwit/state";
import type { DashboardView } from "@/lib/course";
export type * from "@/lib/course";
export type DomainState = { data: Query<DashboardView | null> };
export type DomainActions = { refresh(): Promise<void> };
