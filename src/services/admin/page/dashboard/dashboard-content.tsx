"use client";
import { useDashboard } from "@/services/admin/state/dashboard";
import { QueryMessage } from "@/services/admin/_components/commerce";
import { DashboardSection } from "./dashboard-section";
export function DashboardContent() {
  const dashboard = useDashboard((s) => ({
    data: s.data.load(),
    actions: s.actions,
  }));
  return (
    <QueryMessage
      isError={dashboard.data.isError}
      isLoading={dashboard.data.isLoading || !dashboard.data.isSuccess}
      error={dashboard.data.error}
      onRetry={() => void dashboard.actions.refresh()}
    >
      {dashboard.data.data ? (
        <DashboardSection
          data={dashboard.data.data}
          onRefresh={() => void dashboard.actions.refresh()}
        />
      ) : null}
    </QueryMessage>
  );
}
