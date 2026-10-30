"use client";

import Link from "next/link";
import { siteText } from "@/lib/ui-text";

/**
 * 내 강의실 화면들의 오류 경계 본문(`src/app/(app)/account/error.tsx`). 목록·상세가 `.suspend()` 로 읽으므로
 * 캐시 없이 받은 오류(비로그인 거부 등)는 여기로 온다. 캐시가 있는 화면의 백그라운드 오류는 각 화면이 isError 로 그린다.
 */
export function AccountError({ error }: { error: Error }) {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-16">
      <p className="text-body text-destructive">
        {error.message}{" "}
        <Link href="/login" className="underline">
          {siteText.pages["login"]}
        </Link>
      </p>
    </main>
  );
}
