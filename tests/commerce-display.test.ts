import { describe, expect, it } from "vitest";
import {
  formatMoney,
  formatPriceRange,
  formatOptions,
  formatOrderNumber,
} from "@/lib/commerce";
import { kstCompactDateTime } from "@/lib/kst";

describe("shared API display values", () => {
  it("shows a single price for equal-price options, and a real range otherwise", () => {
    expect(formatPriceRange([])).toBe("미등록");
    expect(formatPriceRange([29000])).toBe("29,000원");
    expect(formatPriceRange([29000, 29000])).toBe("29,000원");
    expect(formatPriceRange([39000, 29000, 32000])).toBe("29,000–39,000원");
    expect(formatMoney(0)).toBe("0원");
    expect(formatMoney(1000000000)).toBe("1,000,000,000원");
  });

  it("keeps option order and original values without repetitive field names", () => {
    expect(formatOptions([])).toBe("기본");
    expect(
      formatOptions([
        { name: "색상", value: "블랙" },
        { name: "사이즈", value: "M" },
      ]),
    ).toBe("블랙 · M");
  });

  it("uses the same reference label across order and payment responses", () => {
    expect(
      formatOrderNumber("order-0195aa00-3333-7333-8333-abcdefabcdef"),
    ).toBe("ORD-ABCDEFABCDEF");
  });

  it("preserves the KST date/year at midnight and UTC year boundaries", () => {
    expect(kstCompactDateTime(new Date("2026-12-31T15:00:00Z"))).toBe(
      "2027.01.01 00:00",
    );
    expect(kstCompactDateTime(new Date("2026-10-14T01:04:59Z"))).toBe(
      "2026.10.14 10:04",
    );
  });
});
