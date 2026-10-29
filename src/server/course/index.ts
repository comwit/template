import "server-only";
import { z } from "zod";
import { ActionError } from "@/lib/utils";
import { CourseError } from "@/server/repository";
import { TossError } from "@/server/payments";

/** 모든 강의 플랫폼 서버 액션을 감싼다. 도메인·결제·검증 오류만 사용자 메시지로 넘긴다. */
export async function courseAction<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    if (error instanceof ActionError) throw error;
    if (error instanceof CourseError || error instanceof TossError)
      throw new ActionError(error.message);
    if (error instanceof z.ZodError)
      throw new ActionError(
        error.issues[0]?.message ?? "입력값을 확인해주세요.",
      );
    // SQL errors can contain submitted values: do not forward/log them.
    throw new ActionError(
      "요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.",
    );
  }
}
export * from "./presenters";
export {
  paymentSuccess,
  paymentFailure,
  paymentWebhook,
  courseMaintenance,
} from "./handlers";
