import type { UploadTicket, ImageAsset } from "@/services/admin/api/media";
export type { UploadTicket, ImageAsset } from "@/services/admin/api/media";
export type MediaState = { isSaving: boolean; error: string | null };
export type MediaActions = {
  prepare(contentType: string): Promise<UploadTicket>;
  complete(
    id: string,
    width: number,
    height: number,
    thumbId?: string,
  ): Promise<ImageAsset>;
  fail(message: string): void;
};
