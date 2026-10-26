import type { ListFilter, NotificationView } from "@/lib/commerce";
import type { PageRequest, Pageable } from "@/server/repository/types";
export interface AdminNotificationsAPI {
  findAll(
    filter: ListFilter,
    pageable: PageRequest,
  ): Promise<Pageable<NotificationView>>;
  reconcile(id: string): Promise<void>;
  retry(id: string): Promise<void>;
  processPending(): Promise<{ processed: number; failed: number }>;
}
