"use client";
import { Editor } from "@/lib/components/ui/editor";
import { AdminSection } from "@/services/admin/_components";
import { ImageUpload } from "@/services/admin/page/courses/image-upload";
import type { ProductInput } from "@/services/admin/state/products";
import type { ImageAsset } from "@/lib/image";
export function DescriptionSection(props: {
  draft: ProductInput;
  busy: boolean;
  onChange(patch: Partial<ProductInput>): void;
  onThumbnail(image: ImageAsset | null): void;
}) {
  return (
    <>
      <AdminSection title="썸네일">
        {/* 업로드 폴더 enum 에 상품 전용 값이 없어 강의 폴더를 함께 쓴다. */}
        <ImageUpload
          label="썸네일"
          folder="products"
          value={props.draft.thumbnail}
          onChange={props.onThumbnail}
          disabled={props.busy}
        />
      </AdminSection>
      <AdminSection title="소개">
        <Editor
          aria-label="상품 소개"
          value={props.draft.description}
          onChange={(description) => props.onChange({ description })}
        />
      </AdminSection>
    </>
  );
}
