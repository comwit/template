"use server";
import { createAction } from "@/lib/utils";
import type * as Types from "../types";
import * as input from "@/lib/course";
import { courseAction, presentDownloadLink } from "@/server/course";
import { purchaseRepository } from "@/server/repository";
import { requireCustomer } from "@/server/auth";
async function _downloadLink(fileId: string): Promise<Types.DownloadLinkView> {
  return courseAction(async () => {
    const actor = await requireCustomer();
    return presentDownloadLink(
      await purchaseRepository.downloadLink(input.entityId.parse(fileId), actor.id),
    );
  });
}
export const downloadLink = createAction(_downloadLink);
