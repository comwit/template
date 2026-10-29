import type { AdminBannersAPI } from "@/services/admin/api/banners";
import type { BannerView } from "@/lib/course";
import { findItem, mockApi } from "../runtime";
import { dateLabel } from "../labels";
export const adminBanners = {
  findAll: mockApi<AdminBannersAPI["findAll"]>((db) =>
    [...db.banners].sort((a, b) => a.position - b.position),
  ),
  save: mockApi<AdminBannersAPI["save"]>((db, input) => {
    const id = input.id ?? crypto.randomUUID();
    const previous = db.banners.find((item) => item.id === id);
    const banner: BannerView = {
      id,
      title: input.title,
      image: input.image,
      linkUrl: input.linkUrl,
      position: input.position,
      active: input.active,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      startsLabel: dateLabel(input.startsAt),
      endsLabel: dateLabel(input.endsAt),
    };
    if (previous) Object.assign(previous, banner);
    else db.banners.push(banner);
    return id;
  }),
  remove: mockApi<AdminBannersAPI["remove"]>((db, id) => {
    findItem(db.banners, id);
    db.banners = db.banners.filter((item) => item.id !== id);
  }),
} satisfies AdminBannersAPI;
