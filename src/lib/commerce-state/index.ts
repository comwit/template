"use client";
import { toast } from "@/lib/components/ui/toast";
export type MutationStatus = { isSaving: boolean; error: string | null };
export async function mutate(
  model: MutationStatus,
  work: () => Promise<void>,
  success?: string,
): Promise<void> {
  if (model.isSaving) return;
  model.isSaving = true;
  model.error = null;
  try {
    await work();
    if (success) toast.success(success);
  } catch (error) {
    model.error =
      error instanceof Error ? error.message : "요청을 처리하지 못했습니다.";
    toast.error(model.error);
  } finally {
    model.isSaving = false;
  }
}
export const newRequestKey = () => crypto.randomUUID();
