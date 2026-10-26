import type { AdminNotificationsAPI } from "@/services/admin/api/notifications";
import { findItem, list, mockApi } from "../runtime";
export const adminNotifications = {
  findAll: mockApi<AdminNotificationsAPI["findAll"]>((db, filter, page) =>
    list(db.notifications, filter, page),
  ),
  reconcile: mockApi<AdminNotificationsAPI["reconcile"]>((db, id) => {
    Object.assign(findItem(db.notifications, id), {
      status: "sent",
      statusLabel: "발송 완료",
      canRetry: false,
      canReconcile: false,
      errorLabel: null,
    });
  }),
  retry: mockApi<AdminNotificationsAPI["retry"]>((db, id) => {
    const item = findItem(db.notifications, id);
    Object.assign(item, {
      status: "accepted",
      statusLabel: "접수",
      attempts: item.attempts + 1,
      canRetry: false,
      canReconcile: true,
      errorLabel: null,
    });
  }),
  processPending: mockApi<AdminNotificationsAPI["processPending"]>(() => ({
    processed: 0,
    failed: 0,
  })),
} satisfies AdminNotificationsAPI;
