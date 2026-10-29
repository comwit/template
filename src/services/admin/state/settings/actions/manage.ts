import { action } from "@comwit/state";
import { domain } from "../model";
import type { DomainActions } from "../types";
export const manageActions = action<DomainActions>(({ state }) => ({
  async refresh() {
    await state(domain).data.refetch();
  },
}));
