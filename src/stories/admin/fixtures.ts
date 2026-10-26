import { formatMoney, formatOrderNumber } from "@/lib/commerce";
import type { ProductView, OrderView, PaymentView } from "@/lib/commerce";
import { product, order, payment } from "../fixtures";

export const productRows: ProductView[] = [
  product,
  {
    ...product,
    id: "0195aa00-1111-7111-8111-111111111112",
    name: "데일리 캔버스 토트백",
    slug: "daily-canvas-tote",
    status: "draft",
    statusLabel: "초안",
    priceLabel: formatMoney(18000),
    skus: [
      {
        ...product.skus[0],
        id: "0195aa00-2222-7222-8222-222222222223",
        code: "BAG-IVORY",
        price: 18000,
        priceLabel: formatMoney(18000),
        options: [{ name: "색상", value: "아이보리" }],
        optionLabel: "아이보리",
        onHand: 5,
        reserved: 2,
        available: 3,
      },
    ],
  },
  {
    ...product,
    id: "0195aa00-1111-7111-8111-111111111113",
    name: "울 블렌드 라운드 가디건",
    slug: "wool-round-cardigan",
    status: "archived",
    statusLabel: "판매 중지",
    priceLabel: formatMoney(89000),
    skus: [
      {
        ...product.skus[0],
        id: "0195aa00-2222-7222-8222-222222222224",
        code: "KNIT-GRAY-L",
        price: 89000,
        priceLabel: formatMoney(89000),
        options: [
          { name: "색상", value: "그레이" },
          { name: "사이즈", value: "L" },
        ],
        optionLabel: "그레이 · L",
        onHand: 0,
        reserved: 0,
        available: 0,
        active: false,
      },
    ],
  },
];
export const orderRows: OrderView[] = [
  order,
  {
    ...order,
    id: "0195aa00-3333-7333-8333-333333333334",
    number: "order-0195aa00-3333-7333-8333-333333333334",
    displayNumber: formatOrderNumber(
      "order-0195aa00-3333-7333-8333-333333333334",
    ),
    customerEmail: "minji@example.test",
    fulfillmentStatus: "shipped",
    fulfillmentLabel: "배송 중",
    shipment: {
      carrier: "CJ대한통운",
      trackingNumber: "123456789012",
      statusLabel: "배송 중",
    },
  },
  {
    ...order,
    id: "0195aa00-3333-7333-8333-333333333335",
    number: "order-0195aa00-3333-7333-8333-333333333335",
    displayNumber: formatOrderNumber(
      "order-0195aa00-3333-7333-8333-333333333335",
    ),
    customerEmail: "jiho@example.test",
    status: "pending",
    statusLabel: "결제 대기",
    paymentStatus: "unpaid",
    paymentLabel: "미결제",
    payment: null,
  },
];
export const paymentRows: PaymentView[] = [
  payment,
  {
    ...payment,
    id: "0195aa00-4444-7444-8444-444444444445",
    orderId: orderRows[1].id,
    providerOrderId: orderRows[1].number,
    displayOrderNumber: orderRows[1].displayNumber,
    status: "partial_cancelled",
    statusLabel: "부분 취소",
    refundedAmount: 29000,
    refundedLabel: formatMoney(29000),
    refundableAmount: 29000,
  },
];
