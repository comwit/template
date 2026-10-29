"use server";
import { createAction } from "@/lib/utils";
import type * as Types from "../types";
import * as input from "@/lib/course";
import { courseAction, presentCertificate } from "@/server/course";
import { enrollmentRepository } from "@/server/repository";
import { requireCustomer } from "@/server/auth";
async function _certificate(id: string): Promise<Types.CertificateView> {
  return courseAction(async () => {
    const actor = await requireCustomer();
    return presentCertificate(
      await enrollmentRepository.findCertificate(input.entityId.parse(id), actor.id),
    );
  });
}
export const certificate = createAction(_certificate);
