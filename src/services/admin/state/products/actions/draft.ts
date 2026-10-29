import { action } from "@comwit/state";
import { adminProducts } from "@/services/admin/api/products";
import { toast } from "@/lib/components/ui/toast";
import { popup } from "@/lib/popup";
import type { ImageAsset } from "@/lib/image";
import type { ProductInput } from "@/lib/course";
import type { DomainActions } from "../types";
import { domain } from "../model";
type DraftActions = Pick<
  DomainActions,
  | "updateDraft"
  | "uploadFile"
  | "removeFile"
  | "moveFile"
  | "setCourses"
  | "setThumbnail"
>;
export const draftActions = action<DraftActions>(({ state }) => {
  class Draft {
    private model = state(domain);
    updateDraft(patch: Partial<ProductInput>) {
      this.model.draft = { ...this.model.draft, ...patch };
    }
    /** presign → 원본 그대로 PUT → complete. 저장과는 별개 플래그라 업로드 중에도 다른 입력은 막지 않는다. */
    async uploadFile(file: File) {
      const productId = this.model.editingId;
      if (!productId) {
        this.model.error = "상품 초안을 먼저 만들어야 파일을 올릴 수 있습니다.";
        toast.error(this.model.error);
        return;
      }
      if (this.model.isUploading) return;
      this.model.isUploading = true;
      this.model.error = null;
      try {
        const ticket = await adminProducts.prepareFile({
          productId,
          name: file.name,
          // 일부 확장자(.epub 등)는 브라우저가 빈 타입을 준다.
          contentType: file.type || "application/octet-stream",
          size: file.size,
        });
        const response = await fetch(ticket.url, {
          method: ticket.method,
          headers: ticket.headers,
          body: file,
        });
        if (!response.ok) throw new Error("파일을 업로드하지 못했습니다.");
        const view = await adminProducts.completeFile(ticket.fileId);
        this.model.files.push(view);
        this.model.draft.fileIds = this.model.files.map((f) => f.id);
        toast.success(`${view.name} 업로드 완료`);
      } catch (error) {
        this.model.error =
          error instanceof Error ? error.message : "파일을 업로드하지 못했습니다.";
        toast.error(this.model.error);
      } finally {
        this.model.isUploading = false;
      }
    }
    async removeFile(fileId: string) {
      const file = this.model.files.find((f) => f.id === fileId);
      if (!file) return;
      if (
        !(await popup.confirm({
          title: "파일을 삭제할까요?",
          description: `${file.name} 을(를) 상품에서 빼고 저장소에서도 지웁니다.`,
          destructive: true,
        }))
      )
        return;
      this.model.error = null;
      try {
        await adminProducts.removeFile(fileId);
        this.model.files = this.model.files.filter((f) => f.id !== fileId);
        this.model.draft.fileIds = this.model.files.map((f) => f.id);
        toast.success("파일을 삭제했습니다.");
      } catch (error) {
        this.model.error =
          error instanceof Error ? error.message : "파일을 삭제하지 못했습니다.";
        toast.error(this.model.error);
      }
    }
    moveFile(index: number, direction: -1 | 1) {
      const files = this.model.files;
      const target = index + direction;
      if (target < 0 || target >= files.length) return;
      const [item] = files.splice(index, 1);
      files.splice(target, 0, item);
      this.model.draft.fileIds = files.map((f) => f.id);
    }
    setCourses(ids: string[]) {
      this.model.draft.courseIds = ids;
      this.model.draft.kind = ids.length ? "bundle" : "file";
    }
    setThumbnail(image: ImageAsset | null) {
      // 서버가 돌려준 ImageAsset 을 그대로 둔다(저장 검증이 JSON 문자열을 비교한다).
      this.model.draft.thumbnail = image;
    }
  }
  return new Draft();
});
