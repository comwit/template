"use server";
import { createAction } from "@/lib/utils";
import type * as Types from "../types";
import * as input from "@/lib/course";
import { courseAction } from "@/server/course";
import { enrollmentRepository } from "@/server/repository";
import { requireAdmin } from "@/server/auth";
async function _grant(request: Types.GrantInput): Promise<string> {
  return courseAction(async () => {
    const actor = await requireAdmin();
    return enrollmentRepository.grant(input.grantSchema.parse(request), actor.id);
  });
}
export const grant = createAction(_grant);
