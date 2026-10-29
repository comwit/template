"use server";
import { createAction } from "@/lib/utils";
import type * as Types from "../types";
import type { PageRequest, Pageable } from "@/server/repository/types";
import * as input from "@/lib/course";
import { courseAction, presentEnrollment } from "@/server/course";
import { enrollmentRepository } from "@/server/repository";
import { requireCustomer } from "@/server/auth";
async function _findAll(pageable: PageRequest): Promise<Pageable<Types.EnrollmentView>> {
  return courseAction(async () => {
    const actor = await requireCustomer();
    const result = await enrollmentRepository.findByUser(
      actor.id,
      input.pageSchema.parse(pageable),
    );
    return { ...result, items: result.items.map(presentEnrollment) };
  });
}
export const findAll = createAction(_findAll);
