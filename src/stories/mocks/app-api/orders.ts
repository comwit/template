import type { CustomerOrdersAPI } from "@/services/app/api/orders";
import { findItem, list, mockApi } from "../runtime";
export const customerOrders = {
  findAll: mockApi<CustomerOrdersAPI["findAll"]>((db, filter, page) =>
    list(db.orders, filter, page),
  ),
  find: mockApi<CustomerOrdersAPI["find"]>((db, id) => findItem(db.orders, id)),
  cancel: mockApi<CustomerOrdersAPI["cancel"]>((db, id) => {
    Object.assign(findItem(db.orders, id), {
      status: "cancelled",
      statusLabel: "취소",
    });
  }),
} satisfies CustomerOrdersAPI;
