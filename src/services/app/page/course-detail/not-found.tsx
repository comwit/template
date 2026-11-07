"use client";

import Link from "next/link";
import { Button } from "@/lib/components/ui/button";

/**
 * 없는 강의 안내. 상세 query 가 `data === null` 을 돌려줄 때 화면이 그린다 — 잘못된 id, 삭제·비공개 강의,
 * 목록 seed 로 먼저 그렸다가 전체 응답이 null 로 온 경우 모두 여기다(generateMetadata 는 같은 경우를 noindex 로 표시).
 */
export function CourseNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col items-start gap-3 px-6 py-16">
      <h1 className="text-display-sm text-balance">강의를 찾을 수 없습니다</h1>
      <p className="text-body text-soft-foreground">
        공개가 끝났거나 주소가 바뀐 강의입니다.
      </p>
      <Button asChild className="mt-2">
        <Link href="/courses">강의 목록으로</Link>
      </Button>
    </main>
  );
}
