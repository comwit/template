"use client";
export * from "./types";
import { create } from "@comwit/state";
import { domain } from "./model";
import { manageActions } from "./actions/manage";
import { draftActions } from "./actions/draft";
import type { DomainState, DomainActions } from "./types";
export const useAdminCourses = create<DomainState, DomainActions>(domain, {
  actions: [manageActions, draftActions],
});
