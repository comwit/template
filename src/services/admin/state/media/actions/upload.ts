import { action } from "@comwit/state";
import { adminMedia } from "@/services/admin/api/media";
import type { MediaActions } from "../types";
import { media } from "../model";
export const uploadActions = action<MediaActions>(({ state }) => {
  class UploadActions {
    private model = state(media);
    async prepare(contentType: string) {
      this.model.error = null;
      this.model.isSaving = true;
      try {
        return await adminMedia.prepare(contentType);
      } catch (error) {
        this.fail(
          error instanceof Error
            ? error.message
            : "업로드를 시작하지 못했습니다.",
        );
        throw error;
      }
    }
    async complete(
      id: string,
      width: number,
      height: number,
      thumbId?: string,
    ) {
      try {
        return await adminMedia.complete(id, width, height, thumbId);
      } finally {
        this.model.isSaving = false;
      }
    }
    fail(message: string) {
      this.model.error = message;
      this.model.isSaving = false;
    }
  }
  return new UploadActions();
});
