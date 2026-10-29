"use client";

import Link from "next/link";
import { siteText } from "@/lib/ui-text";

// 빈 깡통. 파생 프로젝트에서 섹션 파일로 나눠 채운다(page.ai.md). 데이터는 useCatalog의 .suspend()로 SSR 한다.
// 레이아웃에 내비가 없어 주요 화면 링크만 둔다. 강의 카드를 넣을 땐 `<Link onClick={() => catalog.actions.open(course)}>`.
export default function Home() {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-16">
      <h1 className="text-display-sm text-balance">
        {siteText.pages["home"]}
      </h1>
      <nav className="mt-6 flex flex-wrap gap-4 text-body">
        <Link href="/courses" className="underline">
          {siteText.pages["courses"]}
        </Link>
        <Link href="/account/courses" className="underline">
          {siteText.pages["my-courses"]}
        </Link>
        <Link href="/account/orders" className="underline">
          {siteText.pages["orders"]}
        </Link>
        <Link href="/notices" className="underline">
          {siteText.pages["notices"]}
        </Link>
        <Link href="/login" className="underline">
          {siteText.pages["login"]}
        </Link>
      </nav>
    </main>
  );
}
