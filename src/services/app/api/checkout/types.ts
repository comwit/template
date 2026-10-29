import type * as Types from "@/lib/course";
export type * from "@/lib/course";
export interface CheckoutAPI {
  quote(request: Types.QuoteInput): Promise<Types.QuoteView>;
  prepare(request: Types.CheckoutInput): Promise<Types.CheckoutView>;
  confirm(request: Types.ConfirmInput): Promise<Types.OrderView>;
}
