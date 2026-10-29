"use client";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { Input } from "@/lib/components/ui/input";
import { TextField } from "@/lib/components/ui/text-field";
import { Checkbox } from "@/lib/components/ui/checkbox";
import { Editor } from "@/lib/components/ui/editor";
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
import { IconAction } from "@/services/admin/_components/course";
import type { LessonInput } from "@/services/admin/state/courses";
const toInt = (value: string) => {
  const n = Number.parseInt(value, 10);
  return Number.isNaN(n) ? 0 : Math.max(0, n);
};
export function LessonEditor(props: {
  lesson: LessonInput;
  index: number;
  count: number;
  busy: boolean;
  onChange(patch: Partial<LessonInput>): void;
  onMove(direction: -1 | 1): void;
  onRemove(): void;
}) {
  const l = props.lesson;
  const minutes = Math.floor(l.durationSeconds / 60);
  const seconds = l.durationSeconds % 60;
  const name = `레슨 ${props.index + 1}`;
  return (
    <div className="space-y-3 rounded-control border border-border bg-background p-3">
      <div className="flex items-end gap-2">
        <TextField label={name} className="flex-1" required>
          <Input
            value={l.title}
            maxLength={120}
            placeholder="레슨 제목"
            onChange={(e) => props.onChange({ title: e.target.value })}
            required
          />
        </TextField>
        <IconAction
          icon={ArrowUp}
          label={`${name} 위로`}
          onClick={() => props.onMove(-1)}
          disabled={props.busy || props.index === 0}
        />
        <IconAction
          icon={ArrowDown}
          label={`${name} 아래로`}
          onClick={() => props.onMove(1)}
          disabled={props.busy || props.index === props.count - 1}
        />
        <IconAction
          icon={Trash2}
          label={`${name} 삭제`}
          onClick={props.onRemove}
          disabled={props.busy}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-[8rem_1fr_6rem_6rem_auto] sm:items-end">
        <TextField label="영상">
          <Select
            value={l.video?.provider ?? "none"}
            onValueChange={(value) =>
              props.onChange({
                video:
                  value === "none"
                    ? null
                    : {
                        provider: value as "youtube" | "url",
                        url: l.video?.url ?? "",
                      },
              })
            }
          >
            <SelectTrigger className="w-full" aria-label={`${name} 영상 종류`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">없음</SelectItem>
              <SelectItem value="youtube">YouTube</SelectItem>
              <SelectItem value="url">직접 주소</SelectItem>
            </SelectContent>
          </Select>
        </TextField>
        <TextField label="영상 주소">
          <Input
            type="url"
            value={l.video?.url ?? ""}
            maxLength={500}
            disabled={!l.video}
            placeholder={
              l.video?.provider === "youtube"
                ? "https://www.youtube.com/watch?v=…"
                : "https://…/video.mp4"
            }
            onChange={(e) =>
              l.video &&
              props.onChange({ video: { ...l.video, url: e.target.value } })
            }
          />
        </TextField>
        <TextField label="분">
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            value={minutes}
            onChange={(e) =>
              props.onChange({
                durationSeconds: toInt(e.target.value) * 60 + seconds,
              })
            }
          />
        </TextField>
        <TextField label="초">
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            max={59}
            value={seconds}
            onChange={(e) =>
              props.onChange({
                durationSeconds:
                  minutes * 60 + Math.min(59, toInt(e.target.value)),
              })
            }
          />
        </TextField>
        <label className="flex h-9 items-center gap-2 whitespace-nowrap text-body-sm">
          <Checkbox
            checked={l.isPreview}
            onCheckedChange={(isPreview) => props.onChange({ isPreview })}
          />
          미리보기
        </label>
      </div>
      <Accordion type="single" collapsible>
        <AccordionItem value="content" className="border-b-0">
          <AccordionTrigger className="py-2 text-body-sm">
            레슨 자료
          </AccordionTrigger>
          <AccordionContent>
            <Editor
              aria-label={`${name} 자료`}
              value={l.content}
              onChange={(content) => props.onChange({ content })}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
