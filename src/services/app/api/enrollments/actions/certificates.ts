"use server";
import { createAction } from "@/lib/utils";
import type * as Types from "../types";
import { courseAction, presentCertificate } from "@/server/course";
import { enrollmentRepository } from "@/server/repository";
import { requireCustomer } from "@/server/auth";
async function _certificates(): Promise<Types.CertificateView[]> {
  return courseAction(async () => {
    const actor = await requireCustomer();
    return (await enrollmentRepository.findCertificatesByUser(actor.id)).map(
      presentCertificate,
    );
  });
}
export const certificates = createAction(_certificates);
