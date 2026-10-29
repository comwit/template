"use client";

import { useState } from "react";
import { useCommunity } from "@/services/app/state/community";
import { courseText } from "@/lib/ui-text";
import { Button } from "@/lib/components/ui/button";
import { Textarea } from "@/lib/components/ui/textarea";
import { TextField } from "@/lib/components/ui/text-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/lib/components/ui/select";

// 읽는 상태: useCommunity isSaving. 액션: writeReview. 성공하면 부모가 넘긴 onWritten 으로 상세의 수강평 목록을 다시 받는다.
export function ReviewForm({
  courseId,
  onWritten,
}: {
  courseId: string;
  onWritten?: () => void;
}) {
  const [rating, setRating] = useState("5");
  const [content, setContent] = useState("");
  const community = useCommunity((state) => ({
    isSaving: state.isSaving,
    actions: state.actions,
  }));
  return (
    <section className="flex max-w-lg flex-col gap-2">
      <h2 className="text-title-lg">{courseText.reviews}</h2>
      <Select value={rating} onValueChange={setRating}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {["5", "4", "3", "2", "1"].map((value) => (
            <SelectItem key={value} value={value}>
              {"★".repeat(Number(value))}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <TextField label="수강평" required>
        <Textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="강의는 어땠나요? (5자 이상)"
        />
      </TextField>
      <Button
        type="button"
        className="w-fit"
        disabled={community.isSaving || content.trim().length < 5}
        onClick={async () => {
          const id = await community.actions.writeReview({
            courseId,
            rating: Number(rating),
            content: content.trim(),
          });
          if (!id) return;
          setContent("");
          onWritten?.();
        }}
      >
        {courseText.save}
      </Button>
    </section>
  );
}
