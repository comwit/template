/* oxlint-disable custom/api-only-server-action -- External Toss callbacks require public HTTP route handlers. */
import { paymentWebhook } from "@/server/commerce";
export const POST = paymentWebhook;
