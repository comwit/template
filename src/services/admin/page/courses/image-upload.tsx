"use client";
import { Trash2 } from "lucide-react";
import { Input } from "@/lib/components/ui/input";
import { Alert } from "@/lib/components/ui/alert";
import { TextField } from "@/lib/components/ui/text-field";
import {
  resizeImageVariants,
  uploadPresignedImage,
  type ImageAsset,
} from "@/lib/image";
import { useMedia, type UploadFolder } from "@/services/admin/state/media";
import { IconAction } from "@/services/admin/_components/course";
/** 한 장짜리 이미지 업로드. 썸네일을 먼저 완료하고 본 이미지 complete 에 그 id 를 넘긴다. */
export function ImageUpload(props: {
  label: string;
  folder: UploadFolder;
  value: ImageAsset | null;
  onChange(image: ImageAsset | null): void;
  disabled?: boolean;
  /** 미리보기 비율 클래스 (기본 16:9) */
  previewClassName?: string;
}) {
  const media = useMedia((s) => ({
    isSaving: s.isSaving,
    error: s.error,
    actions: s.actions,
  }));
  async function upload(file?: File) {
    if (!file) return;
    try {
      const { full, thumb } = await resizeImageVariants(file);
      const thumbTicket = await media.actions.prepare(
        thumb.blob.type,
        props.folder,
      );
      await uploadPresignedImage(thumbTicket, thumb.blob);
      await media.actions.complete(thumbTicket.id, thumb.width, thumb.height);
      const ticket = await media.actions.prepare(full.blob.type, props.folder);
      await uploadPresignedImage(ticket, full.blob);
      const image = await media.actions.complete(
        ticket.id,
        full.width,
        full.height,
        thumbTicket.id,
      );
      props.onChange(image);
    } catch (error) {
      media.actions.fail(
        error instanceof Error
          ? error.message
          : "이미지 업로드에 실패했습니다.",
      );
    }
  }
  return (
    <div className="space-y-3">
      <TextField label={props.label} helperText="업로드 시 자동으로 축소됩니다.">
        <Input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={props.disabled || media.isSaving}
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
      {props.value ? (
        <div className="flex items-start gap-2">
          <img
            src={props.value.thumb ?? props.value.url}
            width={props.value.width}
            height={props.value.height}
            className={
              props.previewClassName ??
              "aspect-video w-48 rounded-control object-cover"
            }
            alt={props.label}
          />
          <IconAction
            icon={Trash2}
            label={`${props.label} 제거`}
            onClick={() => props.onChange(null)}
            disabled={props.disabled || media.isSaving}
          />
        </div>
      ) : null}
    </div>
  );
}
