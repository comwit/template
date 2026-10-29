"use server";
import { createAction } from "@/lib/utils";
import type * as Types from "../types";
import type { PageRequest, Pageable } from "@/server/repository/types";
import * as input from "@/lib/course";
import { courseAction, presentNotice } from "@/server/course";
import { contentRepository } from "@/server/repository";
async function _notices(pageable: PageRequest): Promise<Pageable<Types.NoticeView>> {
  return courseAction(async () => {
    const result = await contentRepository.findNotices(
      { search: "", status: "" },
      input.pageSchema.parse(pageable),
      true,
    );
    return { ...result, items: result.items.map(presentNotice) };
  });
}
export const notices = createAction(_notices);
