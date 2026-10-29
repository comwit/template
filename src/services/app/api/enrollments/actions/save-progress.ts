"use server";
import { createAction } from "@/lib/utils";
import type * as Types from "../types";
import * as input from "@/lib/course";
import { courseAction } from "@/server/course";
import { enrollmentRepository } from "@/server/repository";
import { requireCustomer } from "@/server/auth";
async function _saveProgress(request: Types.ProgressInput): Promise<Types.ProgressResult> {
  return courseAction(async () => {
    const actor = await requireCustomer();
    return enrollmentRepository.saveProgress(
      actor.id,
      input.progressSchema.parse(request),
    );
  });
}
export const saveProgress = createAction(_saveProgress);
