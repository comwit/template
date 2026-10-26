"use server";
import { createAction } from "@/lib/utils";
import type * as Types from "../types";
import * as input from "@/lib/commerce";
import { commerceMutation } from "@/server/commerce";
import { paymentRepository } from "@/server/repository";
import { requireAdmin } from "@/server/auth";
async function _reconcile(id: string): Promise<string> {
  return commerceMutation(async () => {
    await requireAdmin();
    return paymentRepository.reconcile(input.entityId.parse(id));
  });
}
export const reconcile = createAction(_reconcile);
