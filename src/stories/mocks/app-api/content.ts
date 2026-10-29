import type { ContentAPI } from "@/services/app/api/content";
import { findItem, mockApi, paginate } from "../runtime";
export const content = {
  notices: mockApi<ContentAPI["notices"]>((db, page) =>
    paginate(
      db.notices
        .filter((item) => item.status === "published")
        .sort((a, b) => Number(b.pinned) - Number(a.pinned)),
      page,
    ),
  ),
  notice: mockApi<ContentAPI["notice"]>((db, id) =>
    findItem(
      db.notices.filter((item) => item.status === "published"),
      id,
    ),
  ),
  banners: mockApi<ContentAPI["banners"]>((db) =>
    db.banners
      .filter((item) => item.active)
      .sort((a, b) => a.position - b.position),
  ),
} satisfies ContentAPI;
