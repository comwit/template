"use client";
export * from "./types";
import { create } from "@comwit/state";
import { media } from "./model";
import { uploadActions } from "./actions/upload";
import type { MediaState, MediaActions } from "./types";
export const useMedia = create<MediaState, MediaActions>(media, {
  actions: [uploadActions],
});
