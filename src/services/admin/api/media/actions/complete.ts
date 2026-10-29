"use server";
import { createAction } from "@/lib/utils";
import type { ImageAsset } from "@/lib/image";
import * as input from "@/lib/course";
import { z } from "zod";
import { courseAction } from "@/server/course";
import { operationsRepository } from "@/server/repository";
import { requireAdmin } from "@/server/auth";
async function _complete(id: string, width: number, height: number, thumbId?: string): Promise<ImageAsset> {
  return courseAction(async () => {
    const actor = await requireAdmin();
    return operationsRepository.completeUpload(
      actor.id,
      input.entityId.parse(id),
      z.number().int().positive().max(10000).parse(width),
      z.number().int().positive().max(10000).parse(height),
      input.entityId.optional().parse(thumbId),
    );
  });
}
export const complete = createAction(_complete);
