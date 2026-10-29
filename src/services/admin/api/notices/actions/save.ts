"use server";
import { createAction } from "@/lib/utils";
import type * as Types from "../types";
import * as input from "@/lib/course";
import { courseAction } from "@/server/course";
import { contentRepository } from "@/server/repository";
import { requireAdmin } from "@/server/auth";
async function _save(request: Types.NoticeInput): Promise<string> {
  return courseAction(async () => {
    const actor = await requireAdmin();
    return contentRepository.saveNotice(input.noticeSchema.parse(request), actor.id);
  });
}
export const save = createAction(_save);
