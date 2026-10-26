"use client";
import type { ReactNode } from "react";
import { Plus, Trash2, Image as ImageIcon } from "lucide-react";
import { Button } from "@/lib/components/ui/button";
import { Input } from "@/lib/components/ui/input";
import { Textarea } from "@/lib/components/ui/textarea";
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
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/lib/components/ui/accordion";
import type { CategoryView, ProductInput } from "@/lib/commerce";
export type ProductEditorProps = {
  open: boolean;
  draft: ProductInput;
  categories: CategoryView[];
  busy: boolean;
  error: string | null;
  images?: ReactNode;
  onChange(draft: ProductInput): void;
  onAddSku(): void;
  onRemoveSku(index: number): void;
  onSave(): void;
  onClose(): void;
};
export function ProductEditor(props: ProductEditorProps) {
  const d = props.draft;
  const sku = (index: number, patch: Partial<ProductInput["skus"][number]>) =>
    props.onChange({
      ...d,
      skus: d.skus.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    });
  return (
    <Dialog
      open={props.open}
      onOpenChange={(open) => {
        if (!open) props.onClose();
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{d.id ? "상품 수정" : "상품 등록"}</DialogTitle>
          <DialogDescription className="sr-only">
            SKU마다 옵션 조합과 가격을 입력하세요. 입고 수량은 재고 화면에서
            관리합니다.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            props.onSave();
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <TextField label="상품명" required>
              <Input
                value={d.name}
                maxLength={120}
                onChange={(e) => props.onChange({ ...d, name: e.target.value })}
                required
              />
            </TextField>
            <TextField
              label="상품 주소"
              helperText="영문 소문자, 숫자, 하이픈"
              required
            >
              <Input
                value={d.slug}
                onChange={(e) => props.onChange({ ...d, slug: e.target.value })}
                required
              />
            </TextField>
            <TextField label="카테고리">
              <Select
                value={d.categoryId ?? "none"}
                onValueChange={(value) =>
                  props.onChange({
                    ...d,
                    categoryId: value === "none" ? null : value,
                  })
                }
              >
                <SelectTrigger className="w-full" aria-label="카테고리">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">미분류</SelectItem>
                  {props.categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </TextField>
            <TextField label="판매 상태">
              <Select
                value={d.status}
                onValueChange={(value) =>
                  props.onChange({
                    ...d,
                    status: value as ProductInput["status"],
                  })
                }
              >
                <SelectTrigger className="w-full" aria-label="판매 상태">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">초안</SelectItem>
                  <SelectItem value="active">판매 중</SelectItem>
                  <SelectItem value="archived">판매 중지</SelectItem>
                </SelectContent>
              </Select>
            </TextField>
          </div>
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-title-lg">SKU와 옵션</h2>
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={props.onAddSku}
              >
                <Plus />
                SKU 추가
              </Button>
            </div>
            {d.skus.map((s, i) => (
              <div
                key={s.id ?? i}
                className="space-y-3 rounded-card border border-border p-3"
              >
                <div className="grid grid-cols-2 items-end gap-3 sm:grid-cols-[1fr_1fr_auto_auto]">
                  <TextField label={`SKU 코드 ${i + 1}`} required>
                    <Input
                      value={s.code}
                      onChange={(e) => sku(i, { code: e.target.value })}
                      required
                    />
                  </TextField>
                  <TextField label="판매가 (원)" required>
                    <Input
                      type="number"
                      value={s.price}
                      min={1}
                      step={1}
                      onChange={(e) =>
                        sku(i, { price: Number(e.target.value) })
                      }
                      required
                    />
                  </TextField>
                  <label className="flex h-9 items-center gap-2 text-body-sm">
                    <Checkbox
                      checked={s.active}
                      onCheckedChange={(active) => sku(i, { active })}
                    />
                    판매
                  </label>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={`SKU ${i + 1} 제거`}
                    disabled={d.skus.length === 1}
                    onClick={() => props.onRemoveSku(i)}
                  >
                    <Trash2 />
                  </Button>
                </div>
                {s.options.map((o, oi) => (
                  <div className="grid grid-cols-[1fr_1fr_auto] gap-3" key={oi}>
                    <Input
                      aria-label={`SKU ${i + 1} 옵션 ${oi + 1} 이름`}
                      placeholder="옵션 이름 (색상)"
                      value={o.name}
                      onChange={(e) =>
                        sku(i, {
                          options: s.options.map((v, n) =>
                            n === oi ? { ...v, name: e.target.value } : v,
                          ),
                        })
                      }
                    />
                    <Input
                      aria-label={`SKU ${i + 1} 옵션 ${oi + 1} 값`}
                      placeholder="옵션 값 (검정)"
                      value={o.value}
                      onChange={(e) =>
                        sku(i, {
                          options: s.options.map((v, n) =>
                            n === oi ? { ...v, value: e.target.value } : v,
                          ),
                        })
                      }
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label="옵션 제거"
                      onClick={() =>
                        sku(i, {
                          options: s.options.filter((_, n) => n !== oi),
                        })
                      }
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    sku(i, { options: [...s.options, { name: "", value: "" }] })
                  }
                  disabled={s.options.length >= 5}
                >
                  옵션 추가
                </Button>
              </div>
            ))}
          </section>
          <Accordion type="single" collapsible>
            <AccordionItem value="details">
              <AccordionTrigger className="py-3">
                <span className="flex items-center gap-2">
                  <ImageIcon className="size-4" aria-hidden="true" />
                  상품 설명·이미지
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                {" "}
                <TextField label="상품 설명">
                  <Textarea
                    value={d.description}
                    rows={4}
                    maxLength={10000}
                    onChange={(e) =>
                      props.onChange({ ...d, description: e.target.value })
                    }
                  />
                </TextField>
                {props.images}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
          {props.error ? <Alert tone="destructive">{props.error}</Alert> : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={props.onClose}
              disabled={props.busy}
            >
              닫기
            </Button>
            <Button type="submit" disabled={props.busy}>
              {props.busy ? "저장 중…" : "저장"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
