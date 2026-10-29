import { model } from "@comwit/state";
import type { DomainState } from "./types";
export const domain = model<DomainState>({
  isSaving: false,
  error: null,
});
