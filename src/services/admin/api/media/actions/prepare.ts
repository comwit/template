"use server";
import { createAction } from "@/lib/utils";
import type * as Types from "../types";
import type { UploadTicket, ImageAsset } from "../types";
import { z } from "zod";
import { commerceAction } from "@/server/commerce";
import { operationsRepository } from "@/server/repository";
import { requireAdmin } from "@/server/auth";
async function _prepare(contentType: string): Promise<UploadTicket> {
  return commerceAction(async () => {
    const actor = await requireAdmin();
    return operationsRepository.prepareUpload(
      actor.id,
      z.enum(["image/webp", "image/jpeg", "image/png"]).parse(contentType),
    );
  });
}
export const prepare = createAction(_prepare);
