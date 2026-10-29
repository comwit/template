"use server";
import { createAction } from "@/lib/utils";
import * as input from "@/lib/course";
import { z } from "zod";
import { courseAction } from "@/server/course";
import { couponRepository } from "@/server/repository";
import { requireAdmin } from "@/server/auth";
async function _setActive(id: string, active: boolean): Promise<void> {
  return courseAction(async () => {
    const actor = await requireAdmin();
    await couponRepository.setActive(
      input.entityId.parse(id),
      z.boolean().parse(active),
      actor.id,
    );
  });
}
export const setActive = createAction(_setActive);
