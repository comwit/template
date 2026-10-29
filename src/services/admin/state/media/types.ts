import type { UploadTicket, UploadFolder } from "@/services/admin/api/media";
import type { ImageAsset } from "@/lib/image";
export type { UploadTicket, UploadFolder } from "@/services/admin/api/media";
export type { ImageAsset } from "@/lib/image";
export type MediaState = { isSaving: boolean; error: string | null };
export type MediaActions = {
  prepare(contentType: string, folder: UploadFolder): Promise<UploadTicket>;
  complete(
    id: string,
    width: number,
    height: number,
    thumbId?: string,
  ): Promise<ImageAsset>;
  fail(message: string): void;
};
