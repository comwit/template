"use server";
import { createAction } from "@/lib/utils";
import type * as Types from "../types";
import * as input from "@/lib/course";
import { courseAction, presentPlayer } from "@/server/course";
import { enrollmentRepository } from "@/server/repository";
import { requireCustomer } from "@/server/auth";
async function _player(courseId: string): Promise<Types.PlayerView> {
  return courseAction(async () => {
    const actor = await requireCustomer();
    return presentPlayer(
      await enrollmentRepository.player(input.entityId.parse(courseId), actor.id),
    );
  });
}
export const player = createAction(_player);
