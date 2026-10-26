import { commerceText } from "@/lib/ui-text";
import type { SkuOption } from "./index";

const numberFormatter = new Intl.NumberFormat("ko-KR");

export function formatMoney(amount: number): string {
  return `${numberFormatter.format(amount)}원`;
}

/** A range only when prices differ; equal-price options are a single price. */
export function formatPriceRange(prices: number[]): string {
  if (!prices.length) return commerceText.noPrice;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max
    ? formatMoney(min)
    : `${numberFormatter.format(min)}–${formatMoney(max)}`;
}

export function formatOptions(options: SkuOption[]): string {
  return (
    options.map((option) => option.value).join(" · ") ||
    commerceText.defaultOption
  );
}

/** Display only. Full identifiers remain available for queries and operations. */
export function formatOrderNumber(number: string): string {
  return `ORD-${number.slice(-12).toUpperCase()}`;
}
