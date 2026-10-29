"use client";
import { useState } from "react";
import { Button } from "@/lib/components/ui/button";
import { Input } from "@/lib/components/ui/input";
import { TextField } from "@/lib/components/ui/text-field";
import { Checkbox } from "@/lib/components/ui/checkbox";
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
import type { CouponInput, CourseSummary, ProductSummary } from "@/lib/course";
export type CouponEditorProps = {
  open: boolean;
  draft: CouponInput;
  courses: CourseSummary[];
  products: ProductSummary[];
  busy: boolean;
  error: string | null;
  onChange(draft: CouponInput): void;
  onSave(): void;
  onClose(): void;
};
/** 빈 숫자 입력은 null, 그 외는 정수로 */
const optionalInt = (value: string): number | null =>
  value.trim() === "" ? null : Number(value);
export function CouponEditor(props: CouponEditorProps) {
  const d = props.draft;
  const patch = (next: Partial<CouponInput>) =>
    props.onChange({ ...d, ...next });
  // 범위를 골랐지만 아직 대상을 안 고른 상태를 기억한다 (id 가 없으면 '전체'로 보이는 것을 막는다).
  const [pendingScope, setPendingScope] = useState<"course" | "product" | null>(null);
  const scope = d.productId
    ? "product"
    : d.courseId
      ? "course"
      : (pendingScope ?? "all");
  return (
    <Dialog
      open={props.open}
      onOpenChange={(open) => {
        if (!open) {
          setPendingScope(null);
          props.onClose();
        }
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{d.id ? "쿠폰 수정" : "쿠폰 등록"}</DialogTitle>
          <DialogDescription className="sr-only">
            쿠폰 코드와 할인 조건, 사용 기간과 횟수 제한을 입력하세요.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            props.onSave();
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label="코드" helperText="영문 대문자, 숫자, 하이픈" required>
              <Input
                value={d.code}
                className="font-mono uppercase"
                minLength={4}
                maxLength={30}
                pattern="[A-Za-z0-9-]+"
                onChange={(e) => patch({ code: e.target.value.toUpperCase() })}
                required
              />
            </TextField>
            <TextField label="쿠폰명" required>
              <Input
                value={d.name}
                maxLength={80}
                onChange={(e) => patch({ name: e.target.value })}
                required
              />
            </TextField>
            <TextField label="할인 방식">
              <Select
                value={d.type}
                onValueChange={(value) =>
                  patch({ type: value as CouponInput["type"] })
                }
              >
                <SelectTrigger className="w-full" aria-label="할인 방식">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">정률 (%)</SelectItem>
                  <SelectItem value="fixed">정액 (원)</SelectItem>
                </SelectContent>
              </Select>
            </TextField>
            <TextField
              label={d.type === "percent" ? "할인율 (%)" : "할인액 (원)"}
              required
            >
              <Input
                type="number"
                value={d.value}
                min={1}
                max={d.type === "percent" ? 100 : 1_000_000_000}
                step={1}
                onChange={(e) => patch({ value: Number(e.target.value) })}
                required
              />
            </TextField>
            <TextField label="최소 결제 금액 (원)">
              <Input
                type="number"
                value={d.minAmount}
                min={0}
                step={1}
                onChange={(e) => patch({ minAmount: Number(e.target.value) })}
              />
            </TextField>
            <TextField
              label="최대 할인 금액 (원)"
              helperText={d.type === "percent" ? "비우면 제한 없음" : undefined}
            >
              <Input
                type="number"
                value={d.maxDiscount ?? ""}
                min={0}
                step={1}
                disabled={d.type === "fixed"}
                onChange={(e) =>
                  patch({ maxDiscount: optionalInt(e.target.value) })
                }
              />
            </TextField>
            <TextField label="적용 범위">
              <Select
                value={scope}
                onValueChange={(value) => {
                  // 강의·상품 중 하나만 한정할 수 있다. 범위를 바꾸면 양쪽 id 를 비우고 대상은 다시 고른다.
                  setPendingScope(value === "all" ? null : (value as "course" | "product"));
                  patch({ courseId: null, productId: null });
                }}
              >
                <SelectTrigger className="w-full" aria-label="적용 범위">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="course">강의 한정</SelectItem>
                  <SelectItem value="product">상품 한정</SelectItem>
                </SelectContent>
              </Select>
            </TextField>
            {scope === "course" ? (
              <TextField label="적용 강의" required>
                <Select
                  value={d.courseId ?? undefined}
                  onValueChange={(value) => patch({ courseId: value, productId: null })}
                >
                  <SelectTrigger className="w-full" aria-label="적용 강의">
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
            ) : scope === "product" ? (
              <TextField label="적용 상품" required>
                <Select
                  value={d.productId ?? undefined}
                  onValueChange={(value) => patch({ courseId: null, productId: value })}
                >
                  <SelectTrigger className="w-full" aria-label="적용 상품">
                    <SelectValue placeholder="상품 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {props.products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TextField>
            ) : (
              <div className="hidden sm:block" aria-hidden="true" />
            )}
            <TextField label="시작">
              <Input
                type="datetime-local"
                value={d.startsAt ?? ""}
                onChange={(e) => patch({ startsAt: e.target.value || null })}
              />
            </TextField>
            <TextField label="종료">
              <Input
                type="datetime-local"
                value={d.endsAt ?? ""}
                min={d.startsAt ?? undefined}
                onChange={(e) => patch({ endsAt: e.target.value || null })}
              />
            </TextField>
            <TextField label="전체 사용 횟수" helperText="비우면 제한 없음">
              <Input
                type="number"
                value={d.usageLimit ?? ""}
                min={1}
                step={1}
                onChange={(e) =>
                  patch({ usageLimit: optionalInt(e.target.value) })
                }
              />
            </TextField>
            <TextField label="1인당 사용 횟수" required>
              <Input
                type="number"
                value={d.perUserLimit}
                min={1}
                max={100}
                step={1}
                onChange={(e) =>
                  patch({ perUserLimit: Number(e.target.value) })
                }
                required
              />
            </TextField>
          </div>
          <label className="flex items-center gap-2 text-body-sm">
            <Checkbox
              checked={d.active}
              onCheckedChange={(active) => patch({ active })}
            />
            사용 가능
          </label>
          {props.error ? (
            <Alert tone="destructive">{props.error}</Alert>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={props.onClose}
              disabled={props.busy}
            >
              {courseText.cancel}
            </Button>
            <Button type="submit" disabled={props.busy}>
              {courseText.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
