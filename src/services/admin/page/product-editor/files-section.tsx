"use client";
import { ArrowDown, ArrowUp, FileText, Trash2 } from "lucide-react";
import { Input } from "@/lib/components/ui/input";
import { TextField } from "@/lib/components/ui/text-field";
import { EmptyState } from "@/lib/components/ui/empty-state";
import { AdminSection } from "@/services/admin/_components";
import { IconAction, StatusBadge } from "@/services/admin/_components/course";
import type { ProductFileView } from "@/services/admin/state/products";
const ACCEPT =
  ".pdf,.zip,.epub,.docx,.xlsx,.pptx,.txt,.csv,.json,.png,.jpg,.webp,.mp3,.mp4";
const fileStatusLabel = { pending: "업로드 중", ready: "준비됨", deleted: "삭제됨" };
export function FilesSection(props: {
  files: ProductFileView[];
  busy: boolean;
  uploading: boolean;
  onUpload(file: File): void;
  onRemove(fileId: string): void;
  onMove(index: number, direction: -1 | 1): void;
}) {
  const disabled = props.busy || props.uploading;
  return (
    <AdminSection
      title="파일"
      meta={`${props.files.length}개`}
      description="구매자가 내려받는 파일입니다. 올린 순서대로 보여집니다."
    >
      <TextField label="파일 추가" helperText="최대 2GB. 원본 그대로 저장됩니다.">
        <Input
          type="file"
          accept={ACCEPT}
          disabled={disabled}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) props.onUpload(file);
            e.target.value = "";
          }}
        />
      </TextField>
      {props.uploading ? (
        <p role="status" className="text-body-sm">
          업로드 중…
        </p>
      ) : null}
      {props.files.length === 0 ? (
        <EmptyState
          title="파일이 없습니다"
          description="PDF·ZIP 같은 자료를 올리세요. 강의 묶음만 팔 때는 비워도 됩니다."
        />
      ) : (
        <ul className="divide-y divide-border rounded-control border border-border">
          {props.files.map((file, index) => (
            <li key={file.id} className="flex items-center gap-3 px-3 py-2">
              <FileText
                className="size-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-body-sm font-medium" title={file.name}>
                  {file.name}
                </p>
                <p className="text-caption text-muted-foreground">
                  {file.sizeLabel} · {file.contentType}
                </p>
              </div>
              <StatusBadge
                status={file.status === "ready" ? "done" : file.status}
                label={fileStatusLabel[file.status]}
              />
              <div className="flex items-center">
                <IconAction
                  icon={ArrowUp}
                  label={`${file.name} 위로`}
                  onClick={() => props.onMove(index, -1)}
                  disabled={disabled || index === 0}
                />
                <IconAction
                  icon={ArrowDown}
                  label={`${file.name} 아래로`}
                  onClick={() => props.onMove(index, 1)}
                  disabled={disabled || index === props.files.length - 1}
                />
                <IconAction
                  icon={Trash2}
                  label={`${file.name} 삭제`}
                  onClick={() => props.onRemove(file.id)}
                  disabled={disabled}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </AdminSection>
  );
}
