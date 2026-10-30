"use client";

import type { ReactNode } from "react";
import { siteText } from "@/lib/ui-text";

export { OrderList } from "./order-list";
export { OrderListSkeleton } from "./skeleton";

// 빈 깡통. 파생 프로젝트에서 섹션 파일로 나눠 채운다(page.ai.md).
// 화면 셸: 제목처럼 데이터가 없는 부분만 둔다(정적 셸에 들어가 바로 뜬다). 데이터가 들어가는 목록은
// 라우트가 children 으로 넘기는 Suspense 경계(OrderList, fallback OrderListSkeleton)에 있다 — Courses 와 같은 구조.
export default function Orders({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-16">
      <h1 className="text-display-sm text-balance">
        {siteText.pages["orders"]}
      </h1>
      {children}
    </main>
  );
}
