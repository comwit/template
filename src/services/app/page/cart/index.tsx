"use client";

import { storefrontText } from "@/lib/ui-text";

// 빈 깡통. 파생 프로젝트에서 섹션 파일로 나눠 채운다(page.ai.md). useCart로 담긴 SKU·수량을 읽고 수량 변경·삭제는 actions로 보낸다.
export default function Cart() {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-16">
      <h1 className="text-display-sm text-balance">
        {storefrontText.pages["cart"]}
      </h1>
    </main>
  );
}
