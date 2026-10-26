"use server";
import { formatMoney } from "@/lib/commerce";
import { createAction } from "@/lib/utils";
import type * as Types from "../types";
import { commerceAction } from "@/server/commerce";
import { operationsRepository } from "@/server/repository";
import { requireAdmin } from "@/server/auth";
async function _find(): Promise<Types.SettingsView> {
  return commerceAction(async () => {
    await requireAdmin();
    const settings = operationsRepository.settings();
    return {
      ...settings,
      shippingFeeLabel: formatMoney(settings.shippingFee),
      freeShippingThresholdLabel: formatMoney(settings.freeShippingThreshold),
    };
  });
}
export const find = createAction(_find);
