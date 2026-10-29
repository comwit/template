"use server";
import { createAction } from "@/lib/utils";
import type * as Types from "../types";
import { z } from "zod";
import { courseAction } from "@/server/course";
import { operationsRepository } from "@/server/repository";
import { requireAdmin } from "@/server/auth";
async function _prepare(contentType: string, folder: Types.UploadFolder): Promise<Types.UploadTicket> {
  return courseAction(async () => {
    const actor = await requireAdmin();
    return operationsRepository.prepareUpload(
      actor.id,
      z.enum(["image/webp", "image/jpeg", "image/png"]).parse(contentType),
      z.enum(["courses", "products", "instructors", "banners", "content"]).parse(folder),
    );
  });
}
export const prepare = createAction(_prepare);
