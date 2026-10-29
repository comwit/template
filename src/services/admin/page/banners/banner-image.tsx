"use client";
import { Input } from "@/lib/components/ui/input";
import { Button } from "@/lib/components/ui/button";
import { Alert } from "@/lib/components/ui/alert";
import { TextField } from "@/lib/components/ui/text-field";
import { resizeImageVariants, uploadPresignedImage } from "@/lib/image";
import { useMedia } from "@/services/admin/state/media";
import { useAdminBanners } from "@/services/admin/state/banners";
export function BannerImage() {
  const media = useMedia((s) => ({
    isSaving: s.isSaving,
    error: s.error,
    actions: s.actions,
  }));
  const banners = useAdminBanners((s) => ({
    image: s.draft.image,
    actions: s.actions,
  }));
  async function upload(file?: File) {
    if (!file) return;
    try {
      // 썸네일을 먼저 완료하고, 본 이미지 완료 때 그 id 를 넘겨 ImageAsset.thumb 로 묶는다.
      const { full, thumb } = await resizeImageVariants(file);
      const thumbTicket = await media.actions.prepare(thumb.blob.type, "banners");
      await uploadPresignedImage(thumbTicket, thumb.blob);
      await media.actions.complete(thumbTicket.id, thumb.width, thumb.height);
      const ticket = await media.actions.prepare(full.blob.type, "banners");
      await uploadPresignedImage(ticket, full.blob);
      const image = await media.actions.complete(
        ticket.id,
        full.width,
        full.height,
        thumbTicket.id,
      );
      banners.actions.setImage(image);
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
        label="배너 이미지"
        helperText="업로드 시 자동으로 축소됩니다."
        required
      >
        <Input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={media.isSaving}
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
      {banners.image ? (
        <div className="flex items-start gap-3">
          <img
            src={banners.image.thumb ?? banners.image.url}
            width={banners.image.width}
            height={banners.image.height}
            className="h-28 w-auto max-w-full rounded-control object-cover"
            alt="배너 이미지 미리보기"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => banners.actions.setImage(null)}
          >
            제거
          </Button>
        </div>
      ) : null}
    </section>
  );
}
