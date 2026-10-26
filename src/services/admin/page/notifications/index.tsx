"use client";
import { useAdminNotifications } from "@/services/admin/state/notifications";
import { NotificationsSection } from "./notifications-section";
export default function NotificationsPage() {
  const notification = useAdminNotifications((s) => ({
    list: s.list.load({
      filter: s.filter,
      pageable: { page: s.page, limit: 20 },
    }),
    filter: s.filter,
    busy: s.isSaving,
    error: s.error,
    actions: s.actions,
  }));
  return (
    <NotificationsSection
      query={notification.list}
      filter={notification.filter}
      busy={notification.busy}
      error={notification.error}
      onFilter={notification.actions.setFilter}
      onPage={notification.actions.setPage}
      onRefresh={() => void notification.actions.refresh()}
      onReconcile={(id) => void notification.actions.reconcile(id)}
      onRetry={(id) => void notification.actions.retry(id)}
      onProcessPending={() => void notification.actions.processPending()}
    />
  );
}
