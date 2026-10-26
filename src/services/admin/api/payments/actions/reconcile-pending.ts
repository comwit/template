"use server";
import { createAction } from "@/lib/utils";
import type * as Types from "../types";
import { commerceMutation } from "@/server/commerce";
import { paymentRepository } from "@/server/repository";
import { requireAdmin } from "@/server/auth";
async function _reconcilePending(): Promise<{
  succeeded: number;
  failed: number;
}> {
  return commerceMutation(async () => {
    await requireAdmin();
    return paymentRepository.reconcilePending();
  });
}
export const reconcilePending = createAction(_reconcilePending);
