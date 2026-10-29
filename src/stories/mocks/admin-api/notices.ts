import type { AdminNoticesAPI } from "@/services/admin/api/notices";
import type { NoticeView } from "@/lib/course";
import { findItem, list, mockApi } from "../runtime";
import { nowLabel, statusLabel } from "../labels";
export const adminNotices = {
  findAll: mockApi<AdminNoticesAPI["findAll"]>((db, filter, page) =>
    list(db.notices, filter, page),
  ),
  find: mockApi<AdminNoticesAPI["find"]>((db, id) => findItem(db.notices, id)),
  save: mockApi<AdminNoticesAPI["save"]>((db, input) => {
    const id = input.id ?? crypto.randomUUID();
    const previous = db.notices.find((item) => item.id === id);
    const notice: NoticeView = {
      id,
      title: input.title,
      content: input.content,
      pinned: input.pinned,
      status: input.status,
      statusLabel: statusLabel(input.status),
      publishedLabel:
        input.status === "published"
          ? (previous?.publishedLabel ?? nowLabel())
          : null,
      createdLabel: previous?.createdLabel ?? nowLabel(),
    };
    if (previous) Object.assign(previous, notice);
    else db.notices.unshift(notice);
    return id;
  }),
  remove: mockApi<AdminNoticesAPI["remove"]>((db, id) => {
    findItem(db.notices, id);
    db.notices = db.notices.filter((item) => item.id !== id);
  }),
} satisfies AdminNoticesAPI;
