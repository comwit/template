import { orderRows } from "./fixtures";
/* oxlint-disable custom/kebab-case-filename -- Storybook CSF convention. */
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import OrdersPage from "@/services/admin/page/orders";
import { adminRoutes } from "@/lib/admin-routes";
import { adminPageDecorators, adminPageParameters } from "./preview";
import { expect, userEvent, within } from "storybook/test";
import { order } from "../fixtures";
import { adminOrders } from "../mocks/admin-api/orders";

const meta = {
  id: "admin-orders",
  title: "어드민/주문",
  component: OrdersPage,
  decorators: adminPageDecorators,
  parameters: { ...adminPageParameters(adminRoutes.orders) },
  tags: ["!autodocs"],
} satisfies Meta<typeof OrdersPage>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: "목록",
  parameters: { apiMock: { data: { orders: orderRows } } },
};
export const Empty: Story = {
  name: "빈 화면",
  parameters: { apiMock: { mode: "empty" } },
};
export const Loading: Story = {
  name: "로딩",
  parameters: { apiMock: { mode: "loading" } },
};
export const Error: Story = {
  name: "오류",
  parameters: { apiMock: { mode: "error" } },
};

async function openOrder(canvasElement: HTMLElement) {
  await userEvent.click(
    await within(canvasElement).findByRole("button", {
      name: order.displayNumber,
    }),
  );
  const dialog = within(
    await within(canvasElement.ownerDocument.body).findByRole("dialog"),
  );
  await dialog.findByRole("heading", { name: "상품" });
  return dialog;
}
export const Details: Story = {
  name: "상세",
  play: async ({ canvasElement }) => {
    await openOrder(canvasElement);
  },
};
export const Shipment: Story = {
  name: "발송 입력",
  play: async ({ canvasElement }) => {
    const dialog = await openOrder(canvasElement);
    await userEvent.click(dialog.getByRole("button", { name: "발송" }));
    await expect(
      dialog.getByRole("textbox", { name: "송장 번호" }),
    ).toBeVisible();
  },
};
export const Refund: Story = {
  name: "부분 환불 입력",
  play: async ({ canvasElement }) => {
    const dialog = await openOrder(canvasElement);
    await userEvent.click(dialog.getByRole("button", { name: "환불" }));
    await userEvent.clear(dialog.getByRole("spinbutton"));
    await userEvent.type(dialog.getByRole("spinbutton"), "1");
    await userEvent.type(
      dialog.getByRole("textbox", { name: "환불 사유" }),
      "단순 변심",
    );
    await expect(
      dialog.getByRole("button", { name: "선택 항목 환불" }),
    ).toBeEnabled();
  },
};
export const Refunded: Story = {
  name: "부분 환불 완료",
  play: async ({ canvasElement }) => {
    const dialog = await openOrder(canvasElement);
    await userEvent.click(dialog.getByRole("button", { name: "환불" }));
    await userEvent.clear(dialog.getByRole("spinbutton"));
    await userEvent.type(dialog.getByRole("spinbutton"), "1");
    await userEvent.type(
      dialog.getByRole("textbox", { name: "환불 사유" }),
      "단순 변심",
    );
    await userEvent.click(
      dialog.getByRole("button", { name: "선택 항목 환불" }),
    );
    await userEvent.click(
      await within(canvasElement.ownerDocument.body).findByRole("button", {
        name: "확인",
      }),
    );
    await expect(
      await dialog.findByText("부분 환불", { exact: true }),
    ).toBeVisible();
    await expect(adminOrders.refund).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: order.id,
        reason: "단순 변심",
        items: [{ orderItemId: order.items[0].id, quantity: 1 }],
      }),
    );
  },
};
export const RefundPending: Story = {
  name: "환불 확인 필요",
  parameters: {
    apiMock: {
      data: {
        orders: [
          {
            ...order,
            payment: { ...order.payment!, pendingRefundId: "pending-refund" },
          },
        ],
      },
    },
  },
  play: async ({ canvasElement }) => {
    await openOrder(canvasElement);
  },
};
export const Shipped: Story = {
  name: "배송 중",
  parameters: {
    apiMock: {
      data: {
        orders: [
          {
            ...order,
            fulfillmentStatus: "shipped",
            fulfillmentLabel: "배송 중",
            shipment: {
              carrier: "CJ대한통운",
              trackingNumber: "123456789012",
              statusLabel: "배송 중",
            },
          },
        ],
      },
    },
  },
  play: async ({ canvasElement }) => {
    await openOrder(canvasElement);
  },
};
