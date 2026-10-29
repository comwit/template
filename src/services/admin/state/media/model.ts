import { model } from "@comwit/state";
import type { MediaState } from "./types";
export const media = model<MediaState>({ isSaving: false, error: null });
