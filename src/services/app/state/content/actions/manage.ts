import { action } from "@comwit/state";
import type { DomainActions } from "../types";
import { domain } from "../model";
export const manageActions = action<DomainActions>(({ state }) => {
  class ManageActions {
    private model = state(domain);
    setPage(page: number) {
      this.model.page = page;
    }
    async refresh() {
      await Promise.all([
        this.model.notices.refetch(),
        this.model.banners.refetch(),
      ]);
    }
  }
  return new ManageActions();
});
