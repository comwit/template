import type { AdminCustomersAPI } from "@/services/admin/api/customers";
import { list, mockApi } from "../runtime";
export const adminCustomers = {
  findAll: mockApi<AdminCustomersAPI["findAll"]>((db, filter, page) =>
    list(db.customers, filter, page),
  ),
} satisfies AdminCustomersAPI;
