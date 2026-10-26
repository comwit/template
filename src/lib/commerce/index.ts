import { z } from "zod";

export const entityId = z.string().uuid();
export const requestKey = z
  .string()
  .min(8)
  .max(100)
  .regex(/^[a-zA-Z0-9_-]+$/);
export const money = z.number().int().min(0).max(1_000_000_000);
export const pageSchema = z.object({
  page: z.number().int().min(1).max(100_000).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});
export const optionSchema = z.object({
  name: z.string().trim().min(1).max(30),
  value: z.string().trim().min(1).max(60),
});
export const imageSchema = z.object({
  url: z.string().url(),
  width: z.number().int().positive().max(10000),
  height: z.number().int().positive().max(10000),
  thumb: z.string().url().optional(),
});
export const productSchema = z
  .object({
    id: entityId.optional(),
    name: z.string().trim().min(1).max(120),
    slug: z
      .string()
      .trim()
      .min(1)
      .max(120)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    categoryId: entityId.nullable().default(null),
    description: z.string().max(10000).default(""),
    status: z.enum(["draft", "active", "archived"]),
    images: z.array(imageSchema).max(10).default([]),
    skus: z
      .array(
        z.object({
          id: entityId.optional(),
          code: z
            .string()
            .trim()
            .min(1)
            .max(60)
            .regex(/^[A-Za-z0-9_-]+$/),
          options: z.array(optionSchema).max(5),
          price: money.min(1),
          active: z.boolean().default(true),
        }),
      )
      .min(1)
      .max(100),
  })
  .superRefine((value, ctx) => {
    const codes = new Set<string>();
    const options = new Set<string>();
    const ids = new Set<string>();
    for (const sku of value.skus) {
      const key = optionKey(sku.options);
      if (
        codes.has(sku.code) ||
        options.has(key) ||
        (sku.id && ids.has(sku.id))
      )
        ctx.addIssue({
          code: "custom",
          path: ["skus"],
          message: "SKU 코드와 옵션 조합이 중복됩니다.",
        });
      if (new Set(sku.options.map((o) => o.name)).size !== sku.options.length)
        ctx.addIssue({
          code: "custom",
          path: ["skus"],
          message: "옵션 이름이 중복됩니다.",
        });
      codes.add(sku.code);
      options.add(key);
      if (sku.id) ids.add(sku.id);
    }
  });
export const categorySchema = z.object({
  id: entityId.optional(),
  name: z.string().trim().min(1).max(60),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(80),
});
export const stockSchema = z.object({
  skuId: entityId,
  quantity: z
    .number()
    .int()
    .min(-1_000_000)
    .max(1_000_000)
    .refine((n) => n !== 0),
  reason: z.string().trim().min(2).max(200),
  requestKey,
});
export const addressSchema = z.object({
  name: z.string().trim().min(1).max(60),
  phone: z.string().regex(/^[0-9+ -]{8,20}$/),
  postalCode: z.string().regex(/^\d{5}$/),
  address: z.string().trim().min(2).max(200),
  detail: z.string().trim().max(200),
  memo: z.string().trim().max(200).default(""),
});
export const checkoutSchema = z
  .object({
    items: z
      .array(
        z.object({
          skuId: entityId,
          quantity: z.number().int().min(1).max(99),
        }),
      )
      .min(1)
      .max(50),
    address: addressSchema,
    requestKey,
  })
  .superRefine((value, ctx) => {
    if (new Set(value.items.map((i) => i.skuId)).size !== value.items.length)
      ctx.addIssue({
        code: "custom",
        path: ["items"],
        message: "중복 SKU는 수량을 합쳐서 주문해주세요.",
      });
  });
export const confirmSchema = z.object({
  orderId: z
    .string()
    .min(6)
    .max(64)
    .regex(/^[a-zA-Z0-9_-]+$/),
  paymentKey: z.string().min(1).max(200),
  amount: money.min(1),
});
export const refundSchema = z
  .object({
    orderId: entityId,
    requestKey,
    items: z
      .array(
        z.object({
          orderItemId: entityId,
          quantity: z.number().int().min(1).max(99),
        }),
      )
      .max(50),
    refundShipping: z.boolean().default(false),
    restock: z.boolean().default(false),
    reason: z.string().trim().min(2).max(120),
  })
  .superRefine((value, ctx) => {
    if (!value.items.length && !value.refundShipping)
      ctx.addIssue({
        code: "custom",
        message: "환불할 상품 또는 배송비를 선택해주세요.",
      });
    if (
      new Set(value.items.map((i) => i.orderItemId)).size !== value.items.length
    )
      ctx.addIssue({ code: "custom", message: "환불 항목이 중복됩니다." });
  });
export const shipmentSchema = z.object({
  orderId: entityId,
  carrier: z.string().trim().min(1).max(50),
  trackingNumber: z
    .string()
    .trim()
    .min(4)
    .max(80)
    .regex(/^[a-zA-Z0-9-]+$/),
});
export const listFilterSchema = z.object({
  search: z.string().trim().max(120).default(""),
  status: z.string().max(40).default(""),
});
export type ProductInput = z.infer<typeof productSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
export type StockInput = z.infer<typeof stockSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type ConfirmInput = z.infer<typeof confirmSchema>;
export type RefundInput = z.infer<typeof refundSchema>;
export type ShipmentInput = z.infer<typeof shipmentSchema>;
export type Address = z.infer<typeof addressSchema>;
export type ListFilter = z.infer<typeof listFilterSchema>;
export type SkuOption = z.infer<typeof optionSchema>;
export type PaymentMode = "test" | "live";

/** Canonical option identity, independent of UI ordering. */
export function optionKey(options: SkuOption[]): string {
  return JSON.stringify(
    [...options]
      .sort((a, b) => a.name.localeCompare(b.name, "en"))
      .map((o) => [o.name, o.value]),
  );
}
export {
  formatMoney,
  formatPriceRange,
  formatOptions,
  formatOrderNumber,
} from "./format";
export const emptyPage = <T>() => ({
  items: [] as T[],
  total: 0,
  page: 1,
  limit: 20,
  totalPages: 0,
});
export type * from "./types";
