"use client";
import { useState } from "react";
import { Button } from "@/lib/components/ui/button";
import { Input } from "@/lib/components/ui/input";
import { TextField } from "@/lib/components/ui/text-field";
import { Alert } from "@/lib/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/lib/components/ui/dialog";
import type { CategoryView, CategoryInput } from "@/services/admin/state/courses";
export function CategoryDialog(props: {
  open: boolean;
  categories: CategoryView[];
  busy: boolean;
  error: string | null;
  onOpenChange(open: boolean): void;
  onSave(input: CategoryInput): Promise<boolean>;
}) {
  const [id, setId] = useState<string | undefined>();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const reset = () => {
    setId(undefined);
    setName("");
    setSlug("");
  };
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>카테고리 관리</DialogTitle>
          <DialogDescription className="sr-only">
            강의를 분류할 카테고리를 등록하거나 수정하세요.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-2 text-body-sm">
          {props.categories.map((c) => (
            <Button
              key={c.id}
              type="button"
              variant={id === c.id ? "secondary" : "outline"}
              size="sm"
              onClick={() => {
                setId(c.id);
                setName(c.name);
                setSlug(c.slug);
              }}
            >
              {c.name}
            </Button>
          ))}
        </div>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void props.onSave({ id, name, slug }).then((ok) => ok && reset());
          }}
        >
          <TextField label="카테고리명" required>
            <Input
              value={name}
              maxLength={60}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </TextField>
          <TextField label="주소" helperText="영문 소문자, 숫자, 하이픈" required>
            <Input
              value={slug}
              maxLength={80}
              onChange={(e) => setSlug(e.target.value)}
              required
            />
          </TextField>
          {props.error ? <Alert tone="destructive">{props.error}</Alert> : null}
          <div className="flex gap-2">
            <Button type="submit" disabled={props.busy}>
              {id ? "수정" : "등록"}
            </Button>
            {id ? (
              <Button type="button" variant="ghost" onClick={reset}>
                새 카테고리
              </Button>
            ) : null}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
