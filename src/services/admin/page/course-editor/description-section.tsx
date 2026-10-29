"use client";
import { Editor } from "@/lib/components/ui/editor";
import { AdminSection } from "@/services/admin/_components";
import { ImageUpload } from "@/services/admin/page/courses/image-upload";
import type { CourseInput } from "@/services/admin/state/courses";
import type { ImageAsset } from "@/lib/image";
export function DescriptionSection(props: {
  draft: CourseInput;
  busy: boolean;
  onChange(patch: Partial<CourseInput>): void;
  onThumbnail(image: ImageAsset | null): void;
}) {
  return (
    <>
      <AdminSection title="썸네일">
        <ImageUpload
          label="썸네일"
          folder="courses"
          value={props.draft.thumbnail}
          onChange={props.onThumbnail}
          disabled={props.busy}
        />
      </AdminSection>
      <AdminSection title="소개">
        <Editor
          aria-label="강의 소개"
          value={props.draft.description}
          onChange={(description) => props.onChange({ description })}
        />
      </AdminSection>
    </>
  );
}
