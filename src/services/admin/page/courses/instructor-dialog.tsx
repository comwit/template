"use client";
import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/lib/components/ui/button";
import { Input } from "@/lib/components/ui/input";
import { Textarea } from "@/lib/components/ui/textarea";
import { TextField } from "@/lib/components/ui/text-field";
import { Alert } from "@/lib/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/lib/components/ui/dialog";
import { IconAction } from "@/services/admin/_components/course";
import type {
  InstructorView,
  InstructorInput,
} from "@/services/admin/state/courses";
import { ImageUpload } from "./image-upload";
const empty = (): InstructorInput => ({
  name: "",
  title: "",
  bio: "",
  image: null,
});
export function InstructorDialog(props: {
  open: boolean;
  instructors: InstructorView[];
  busy: boolean;
  error: string | null;
  onOpenChange(open: boolean): void;
  onSave(input: InstructorInput): Promise<boolean>;
  onRemove(id: string): void;
}) {
  const [form, setForm] = useState<InstructorInput>(empty);
  const reset = () => setForm(empty());
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>강사 관리</DialogTitle>
          <DialogDescription className="sr-only">
            강의에 연결할 강사를 등록하거나 수정하세요.
          </DialogDescription>
        </DialogHeader>
        {props.instructors.length ? (
          <ul className="divide-y divide-border rounded-card border border-border">
            {props.instructors.map((i) => (
              <li key={i.id} className="flex items-center gap-3 px-3 py-2">
                {i.image ? (
                  <img
                    src={i.image.thumb ?? i.image.url}
                    width={40}
                    height={40}
                    className="size-10 shrink-0 rounded-full object-cover"
                    alt=""
                  />
                ) : (
                  <span className="size-10 shrink-0 rounded-full bg-muted" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{i.name}</p>
                  <p className="truncate text-caption text-muted-foreground">
                    {i.title || "—"}
                    {typeof i.courseCount === "number"
                      ? ` · 강의 ${i.courseCount}개`
                      : ""}
                  </p>
                </div>
                <IconAction
                  icon={Pencil}
                  label={`${i.name} 수정`}
                  onClick={() =>
                    setForm({
                      id: i.id,
                      name: i.name,
                      title: i.title,
                      bio: i.bio,
                      image: i.image,
                    })
                  }
                  disabled={props.busy}
                />
                <IconAction
                  icon={Trash2}
                  label={`${i.name} 삭제`}
                  onClick={() => props.onRemove(i.id)}
                  disabled={props.busy}
                />
              </li>
            ))}
          </ul>
        ) : null}
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void props.onSave(form).then((ok) => ok && reset());
          }}
        >
          <h3 className="text-title-md">{form.id ? "강사 수정" : "새 강사"}</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label="이름" required>
              <Input
                value={form.name}
                maxLength={60}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </TextField>
            <TextField label="직함">
              <Input
                value={form.title}
                maxLength={80}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </TextField>
          </div>
          <TextField label="소개">
            <Textarea
              value={form.bio}
              rows={3}
              maxLength={2000}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
            />
          </TextField>
          <ImageUpload
            label="프로필 사진"
            folder="instructors"
            value={form.image}
            onChange={(image) => setForm({ ...form, image })}
            disabled={props.busy}
            previewClassName="size-24 rounded-full object-cover"
          />
          {props.error ? <Alert tone="destructive">{props.error}</Alert> : null}
          <div className="flex gap-2">
            <Button type="submit" disabled={props.busy}>
              {form.id ? "수정" : "등록"}
            </Button>
            {form.id ? (
              <Button type="button" variant="ghost" onClick={reset}>
                새 강사
              </Button>
            ) : null}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
