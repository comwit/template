"use server";
import { createAction } from "@/lib/utils";
import type * as Types from "../types";
import { courseAction, presentBanner } from "@/server/course";
import { contentRepository } from "@/server/repository";
import { requireAdmin } from "@/server/auth";
async function _findAll(): Promise<Types.BannerView[]> {
  return courseAction(async () => {
    await requireAdmin();
    return (await contentRepository.findBanners()).map(presentBanner);
  });
}
export const findAll = createAction(_findAll);
