"use client";

import { storefrontText } from "@/lib/ui-text";

// 빈 깡통. 파생 프로젝트에서 섹션 파일로 나눠 채운다(page.ai.md). useOrders 목록을 서버 페이지네이션으로 읽는다.
export default function Orders() {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-16">
      <h1 className="text-display-sm text-balance">
        {storefrontText.pages["orders"]}
      </h1>
    </main>
  );
}
