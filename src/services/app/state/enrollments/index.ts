"use client";
export * from "./types";
import { create } from "@comwit/state";
import { domain } from "./model";
import { manageActions } from "./actions/manage";
import type { DomainState, DomainActions } from "./types";
export const useEnrollments = create<DomainState, DomainActions>(domain, {
  actions: [manageActions],
});
