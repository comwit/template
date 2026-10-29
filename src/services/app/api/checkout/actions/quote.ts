"use server";
import { createAction } from "@/lib/utils";
import type * as Types from "../types";
import * as input from "@/lib/course";
import { courseAction, presentQuote } from "@/server/course";
import { orderRepository } from "@/server/repository";
import { requireCustomer } from "@/server/auth";
async function _quote(request: Types.QuoteInput): Promise<Types.QuoteView> {
  return courseAction(async () => {
    const actor = await requireCustomer();
    return presentQuote(
      await orderRepository.quote(input.quoteSchema.parse(request), actor.id),
    );
  });
}
export const quote = createAction(_quote);
