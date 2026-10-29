"use server";
import { createAction } from "@/lib/utils";
import type * as Types from "../types";
import * as input from "@/lib/course";
import { courseAction, presentNotice } from "@/server/course";
import { contentRepository } from "@/server/repository";
import { requireAdmin } from "@/server/auth";
async function _find(id: string): Promise<Types.NoticeView> {
  return courseAction(async () => {
    await requireAdmin();
    return presentNotice(await contentRepository.findNotice(input.entityId.parse(id)));
  });
}
export const find = createAction(_find);
