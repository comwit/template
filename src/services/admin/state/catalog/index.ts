"use client";
export * from "./types";
import { create } from "@comwit/state";
import { catalog } from "./model";
import { manageActions } from "./actions/manage";
import type { CatalogState, CatalogActions } from "./types";
export const useAdminCatalog = create<CatalogState, CatalogActions>(catalog, {
  actions: [manageActions],
});
