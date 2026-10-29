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
  DialogFooter,
} from "@/lib/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/lib/components/ui/select";
import type { CourseSummary, GrantInput } from "@/services/admin/state/students";
export function GrantDialog(props: {
  open: boolean;
  courses: CourseSummary[];
  busy: boolean;
  error: string | null;
  onOpenChange(open: boolean): void;
  onGrant(input: GrantInput): Promise<boolean>;
}) {
  const [courseId, setCourseId] = useState("");
  const [email, setEmail] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const reset = () => {
    setCourseId("");
    setEmail("");
    setExpiresAt("");
  };
  return (
    <Dialog
      open={props.open}
      onOpenChange={(open) => {
        if (!open) reset();
        props.onOpenChange(open);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>수강 권한 부여</DialogTitle>
          <DialogDescription>
            가입된 회원의 이메일로 결제 없이 수강을 열어줍니다.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void props
              .onGrant({ courseId, email, expiresAt: expiresAt || null })
              .then((ok) => {
                if (ok) {
                  reset();
                  props.onOpenChange(false);
                }
              });
          }}
        >
          <TextField label="강의" required>
            <Select value={courseId || undefined} onValueChange={setCourseId}>
              <SelectTrigger className="w-full" aria-label="강의">
                <SelectValue placeholder="강의 선택" />
              </SelectTrigger>
              <SelectContent>
                {props.courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </TextField>
          <TextField label="회원 이메일" required>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </TextField>
          <TextField label="만료일" helperText="비우면 기한 없음">
            <Input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </TextField>
          {props.error ? <Alert tone="destructive">{props.error}</Alert> : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => props.onOpenChange(false)}
              disabled={props.busy}
            >
              취소
            </Button>
            <Button type="submit" disabled={props.busy || !courseId}>
              {props.busy ? "처리 중…" : "부여"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
