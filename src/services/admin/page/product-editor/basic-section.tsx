"use client";
import { Input } from "@/lib/components/ui/input";
import { Textarea } from "@/lib/components/ui/textarea";
import { TextField } from "@/lib/components/ui/text-field";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/lib/components/ui/select";
import { AdminSection } from "@/services/admin/_components";
import type {
  ProductInput,
  CategoryView,
} from "@/services/admin/state/products";
export function BasicSection(props: {
  draft: ProductInput;
  categories: CategoryView[];
  onChange(patch: Partial<ProductInput>): void;
}) {
  const d = props.draft;
  return (
    <AdminSection title="기본 정보">
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label="상품명" required>
          <Input
            value={d.title}
            maxLength={120}
            onChange={(e) => props.onChange({ title: e.target.value })}
            required
          />
        </TextField>
        <TextField label="상품 주소" helperText="영문 소문자, 숫자, 하이픈" required>
          <Input
            value={d.slug}
            maxLength={120}
            onChange={(e) => props.onChange({ slug: e.target.value })}
            required
          />
        </TextField>
        <TextField label="카테고리">
          <Select
            value={d.categoryId ?? "none"}
            onValueChange={(value) =>
              props.onChange({ categoryId: value === "none" ? null : value })
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
        <TextField label="상태" helperText="파일이나 강의가 하나 이상 있어야 공개할 수 있습니다.">
          <Select
            value={d.status}
            onValueChange={(value) =>
              props.onChange({ status: value as ProductInput["status"] })
            }
          >
            <SelectTrigger className="w-full" aria-label="상태">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">초안</SelectItem>
              <SelectItem value="published">공개</SelectItem>
              <SelectItem value="archived">보관</SelectItem>
            </SelectContent>
          </Select>
        </TextField>
      </div>
      <TextField label="한 줄 요약" helperText="목록과 카드에 표시됩니다. 300자 이내">
        <Textarea
          value={d.summary}
          rows={2}
          maxLength={300}
          onChange={(e) => props.onChange({ summary: e.target.value })}
        />
      </TextField>
    </AdminSection>
  );
}
