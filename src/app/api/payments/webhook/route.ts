/* oxlint-disable custom/api-only-server-action -- External Toss callbacks require public HTTP route handlers. */
import { paymentWebhook } from "@/server/course";
export const POST = paymentWebhook;
