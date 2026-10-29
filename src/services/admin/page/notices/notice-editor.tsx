"use client";
import { Button } from "@/lib/components/ui/button";
import { Input } from "@/lib/components/ui/input";
import { TextField } from "@/lib/components/ui/text-field";
import { Checkbox } from "@/lib/components/ui/checkbox";
import { Editor } from "@/lib/components/ui/editor";
import { Alert } from "@/lib/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/lib/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/lib/components/ui/select";
import { courseText } from "@/lib/ui-text";
import type { NoticeInput } from "@/lib/course";
export function NoticeEditor(props: {
  open: boolean;
  draft: NoticeInput;
  busy: boolean;
  error: string | null;
  onChange(draft: NoticeInput): void;
  onSave(): void;
  onClose(): void;
}) {
  const d = props.draft;
  return (
    <Dialog
      open={props.open}
      onOpenChange={(open) => {
        if (!open) props.onClose();
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{d.id ? "공지 수정" : "공지 등록"}</DialogTitle>
          <DialogDescription className="sr-only">
            제목과 내용을 입력하고 게시 상태를 정하세요.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            props.onSave();
          }}
        >
          <TextField label="제목" required>
            <Input
              value={d.title}
              maxLength={120}
              onChange={(e) => props.onChange({ ...d, title: e.target.value })}
              required
            />
          </TextField>
          <div className="flex flex-wrap items-end gap-4">
            <TextField label="상태" className="w-40">
              <Select
                value={d.status}
                onValueChange={(value) =>
                  props.onChange({
                    ...d,
                    status: value as NoticeInput["status"],
                  })
                }
              >
                <SelectTrigger className="w-full" aria-label="상태">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">임시 저장</SelectItem>
                  <SelectItem value="published">게시</SelectItem>
                </SelectContent>
              </Select>
            </TextField>
            <label className="flex items-center gap-2 pb-2 text-body-sm">
              <Checkbox
                checked={d.pinned}
                onCheckedChange={(pinned) => props.onChange({ ...d, pinned })}
              />
              상단 고정
            </label>
          </div>
          <div className="space-y-1.5">
            <p className="text-label font-medium">내용</p>
            <Editor
              value={d.content}
              onChange={(content) => props.onChange({ ...d, content })}
              aria-label="공지 내용"
            />
          </div>
          {props.error ? <Alert tone="destructive">{props.error}</Alert> : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={props.onClose}
              disabled={props.busy}
            >
              {courseText.close}
            </Button>
            <Button type="submit" disabled={props.busy}>
              {props.busy ? "저장 중…" : courseText.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
