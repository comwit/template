/* oxlint-disable custom/api-only-server-action -- External Toss callbacks require public HTTP route handlers. */
import { paymentSuccess } from "@/server/commerce";
export const GET = paymentSuccess;
