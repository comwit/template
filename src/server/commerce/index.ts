import "server-only";
import { after } from "next/server";
import { notificationRepository } from "@/server/repository";
import { z } from "zod";
import { ActionError } from "@/lib/utils";
import { CommerceError } from "@/server/repository";
import { TossError } from "@/server/payments";

export async function commerceAction<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    if (error instanceof ActionError) throw error;
    if (error instanceof CommerceError || error instanceof TossError)
      throw new ActionError(error.message);
    if (error instanceof z.ZodError)
      throw new ActionError(
        error.issues[0]?.message ?? "입력값을 확인해주세요.",
      );
    // SQL errors can contain addresses or other submitted values: do not forward/log them.
    throw new ActionError(
      "요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.",
    );
  }
}
export {
  presentNotification,
  presentProduct,
  presentSku,
  presentOrder,
  presentOrderDetail,
  presentPayment,
  statusLabel,
  optionsLabel,
} from "./presenters";
export {
  paymentSuccess,
  paymentFailure,
  paymentWebhook,
  commerceMaintenance,
} from "./handlers";

export function scheduleNotifications() {
  after(async () => {
    try {
      await notificationRepository.processPending();
    } catch {
      /* Durable rows remain for maintenance. */
    }
  });
}
export async function commerceMutation<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await commerceAction(work);
  } finally {
    scheduleNotifications();
  }
}
