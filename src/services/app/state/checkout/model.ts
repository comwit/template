import { model, query } from "@comwit/state";
import { checkout as api } from "@/services/app/api/checkout";
import type { QuoteInput, QuoteView } from "@/lib/course";
import type { CheckoutState } from "./types";
export const checkout = model<CheckoutState>({
  quote: query<QuoteView | null, QuoteInput>({
    initialData: null,
    queryFn: (input) => api.quote(input),
  }),
  checkout: null,
  order: null,
  couponCode: null,
  mounted: false,
  isSaving: false,
  error: null,
});
