"use server";
import { createAction } from "@/lib/utils";
import type * as Types from "../types";
import * as input from "@/lib/course";
import { courseAction, presentNotice } from "@/server/course";
import { contentRepository } from "@/server/repository";
async function _notice(id: string): Promise<Types.NoticeView> {
  return courseAction(async () => {
    return presentNotice(
      await contentRepository.findNotice(input.entityId.parse(id), true),
    );
  });
}
export const notice = createAction(_notice);
