"use server";
import { createAction } from "@/lib/utils";
import type * as Types from "../types";
import * as input from "@/lib/course";
import { courseAction, presentProgressDetail } from "@/server/course";
import { enrollmentRepository } from "@/server/repository";
import { requireAdmin } from "@/server/auth";
async function _progress(enrollmentId: string): Promise<Types.ProgressDetailView[]> {
  return courseAction(async () => {
    await requireAdmin();
    return (
      await enrollmentRepository.findProgress(input.entityId.parse(enrollmentId))
    ).map(presentProgressDetail);
  });
}
export const progress = createAction(_progress);
