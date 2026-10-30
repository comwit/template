"use client";

import Link from "next/link";
import { siteText, courseText } from "@/lib/ui-text";

/** 캐시 없이 받은 공지 조회 오류(없는·비공개 공지) — notices/[id]/error.tsx 가 그린다. */
export function NoticeNotFound() {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-16">
      <p className="text-body-sm text-muted-foreground">
        {siteText.pages["notice-detail"]}
      </p>
      <p className="mt-8 text-body text-muted-foreground">{courseText.empty}</p>
      <p className="mt-8 text-body-sm">
        <Link href="/notices" className="underline">
          {siteText.pages["notices"]}
        </Link>
      </p>
    </main>
  );
}
