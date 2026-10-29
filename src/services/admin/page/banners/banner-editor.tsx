"use client";
import type { ReactNode } from "react";
import { Button } from "@/lib/components/ui/button";
import { Input } from "@/lib/components/ui/input";
import { TextField } from "@/lib/components/ui/text-field";
import { Switch } from "@/lib/components/ui/switch";
import { Alert } from "@/lib/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/lib/components/ui/dialog";
import { courseText } from "@/lib/ui-text";
import type { BannerDraft } from "@/services/admin/state/banners";
/** ISO → datetime-local 입력값(로컬 시각, YYYY-MM-DDTHH:mm) */
function toLocalInput(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
export function BannerEditor(props: {
  open: boolean;
  draft: BannerDraft;
  busy: boolean;
  error: string | null;
  image: ReactNode;
  onChange(draft: BannerDraft): void;
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
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{d.id ? "배너 수정" : "배너 등록"}</DialogTitle>
          <DialogDescription className="sr-only">
            배너 이미지와 링크, 노출 기간을 설정하세요.
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
              maxLength={80}
              onChange={(e) => props.onChange({ ...d, title: e.target.value })}
              required
            />
          </TextField>
          {props.image}
          <TextField label="링크 주소" helperText="비워두면 클릭해도 이동하지 않습니다.">
            <Input
              value={d.linkUrl}
              maxLength={500}
              placeholder="/courses/slug 또는 https://…"
              onChange={(e) =>
                props.onChange({ ...d, linkUrl: e.target.value })
              }
            />
          </TextField>
          <div className="grid gap-3 sm:grid-cols-3">
            <TextField label="순서" helperText="작을수록 먼저 노출">
              <Input
                type="number"
                min={0}
                max={1000}
                step={1}
                value={d.position}
                onChange={(e) =>
                  props.onChange({
                    ...d,
                    position: Math.max(0, Number(e.target.value) || 0),
                  })
                }
              />
            </TextField>
            <TextField label="노출 시작">
              <Input
                type="datetime-local"
                value={toLocalInput(d.startsAt)}
                onChange={(e) =>
                  props.onChange({ ...d, startsAt: e.target.value || null })
                }
              />
            </TextField>
            <TextField label="노출 종료">
              <Input
                type="datetime-local"
                value={toLocalInput(d.endsAt)}
                onChange={(e) =>
                  props.onChange({ ...d, endsAt: e.target.value || null })
                }
              />
            </TextField>
          </div>
          <label className="flex items-center gap-2 text-body-sm">
            <Switch
              checked={d.active}
              onCheckedChange={(active) => props.onChange({ ...d, active })}
            />
            노출
          </label>
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
