"use server";
import { createAction } from "@/lib/utils";
import type * as Types from "../types";
import { courseAction, presentBanner } from "@/server/course";
import { contentRepository } from "@/server/repository";
async function _banners(): Promise<Types.BannerView[]> {
  return courseAction(async () => {
    return (await contentRepository.findBanners(true)).map(presentBanner);
  });
}
export const banners = createAction(_banners);
