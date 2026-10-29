"use client";
export * from "./types";
import { create } from "@comwit/state";
import { domain } from "./model";
import { writeActions } from "./actions/write";
import type { DomainState, DomainActions } from "./types";
export const useCommunity = create<DomainState, DomainActions>(domain, {
  actions: [writeActions],
});
