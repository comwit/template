"use client";
import { Input } from "@/lib/components/ui/input";
import { TextField } from "@/lib/components/ui/text-field";
import { AdminSection } from "@/services/admin/_components";
import type { ProductInput } from "@/services/admin/state/products";
const toInt = (value: string) => {
  const n = Number.parseInt(value, 10);
  return Number.isNaN(n) ? 0 : Math.max(0, n);
};
export function PricingSection(props: {
  draft: ProductInput;
  onChange(patch: Partial<ProductInput>): void;
}) {
  const d = props.draft;
  return (
    <AdminSection title="가격">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <TextField label="정가 (원)" helperText="0이면 무료 자료 (연락처를 받고 바로 제공)" required>
          <Input
            type="number"
            inputMode="numeric"
            value={d.price}
            min={0}
            step={1}
            onChange={(e) => props.onChange({ price: toInt(e.target.value) })}
            required
          />
        </TextField>
        <TextField label="할인가 (원)" helperText="비우면 할인 없음">
          <Input
            type="number"
            inputMode="numeric"
            value={d.discountPrice ?? ""}
            min={0}
            step={1}
            onChange={(e) =>
              props.onChange({
                discountPrice:
                  e.target.value === "" ? null : toInt(e.target.value),
              })
            }
          />
        </TextField>
        <TextField label="할인 종료" helperText="비우면 기한 없음">
          <Input
            type="datetime-local"
            value={d.discountEndsAt ?? ""}
            onChange={(e) =>
              props.onChange({ discountEndsAt: e.target.value || null })
            }
          />
        </TextField>
        <TextField label="다운로드 횟수 제한" helperText="비우면 무제한. 파일마다 1회로 셉니다.">
          <Input
            type="number"
            inputMode="numeric"
            value={d.downloadLimit ?? ""}
            min={1}
            max={1000}
            step={1}
            placeholder="무제한"
            onChange={(e) =>
              props.onChange({
                downloadLimit:
                  e.target.value === ""
                    ? null
                    : Math.max(1, toInt(e.target.value)),
              })
            }
          />
        </TextField>
      </div>
    </AdminSection>
  );
}
