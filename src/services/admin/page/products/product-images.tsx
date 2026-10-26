"use client";
import { Input } from "@/lib/components/ui/input";
import { Button } from "@/lib/components/ui/button";
import { Alert } from "@/lib/components/ui/alert";
import { TextField } from "@/lib/components/ui/text-field";
import { resizeImageVariants, uploadPresignedImage } from "@/lib/image";
import { useMedia } from "@/services/admin/state/media";
import { useAdminCatalog } from "@/services/admin/state/catalog";
export function ProductImages() {
  const media = useMedia((s) => ({
    isSaving: s.isSaving,
    error: s.error,
    actions: s.actions,
  }));
  const catalog = useAdminCatalog((s) => ({
    images: s.draft.images,
    actions: s.actions,
  }));
  async function upload(file?: File) {
    if (!file) return;
    try {
      // 썸네일(목록·카드용)을 먼저 완료하고, 본 이미지 완료 때 그 id 를 넘겨 ImageAsset.thumb 로 묶는다.
      const { full, thumb } = await resizeImageVariants(file);
      const thumbTicket = await media.actions.prepare(thumb.blob.type);
      await uploadPresignedImage(thumbTicket, thumb.blob);
      await media.actions.complete(thumbTicket.id, thumb.width, thumb.height);
      const ticket = await media.actions.prepare(full.blob.type);
      await uploadPresignedImage(ticket, full.blob);
      const image = await media.actions.complete(
        ticket.id,
        full.width,
        full.height,
        thumbTicket.id,
      );
      catalog.actions.addImage(image);
    } catch (error) {
      media.actions.fail(
        error instanceof Error
          ? error.message
          : "이미지 업로드에 실패했습니다.",
      );
    }
  }
  return (
    <section className="space-y-3">
      <TextField
        label="상품 이미지"
        helperText="업로드 시 자동으로 축소됩니다. 최대 10장입니다."
      >
        <Input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={media.isSaving || catalog.images.length >= 10}
          onChange={(e) => {
            void upload(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </TextField>
      {media.isSaving ? (
        <p role="status" className="text-body-sm">
          업로드 중…
        </p>
      ) : null}
      {media.error ? <Alert tone="destructive">{media.error}</Alert> : null}
      <div className="flex flex-wrap gap-3">
        {catalog.images.map((image, index) => (
          <div key={image.url} className="space-y-1">
            <img
              src={image.thumb ?? image.url}
              width={image.width}
              height={image.height}
              className="size-24 rounded-control object-cover"
              alt={`상품 이미지 ${index + 1}`}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => catalog.actions.removeImage(index)}
            >
              제거
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}
