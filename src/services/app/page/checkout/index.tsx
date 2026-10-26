"use client";

import { storefrontText } from "@/lib/ui-text";

// 빈 깡통. 파생 프로젝트에서 섹션 파일로 나눠 채운다(page.ai.md). `if (await actions.prepare(input)) await actions.pay();` 처럼 prepare()가 돌려준 주문이 있을 때만 이어서 pay()를 부른다.
export default function Checkout() {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-16">
      <h1 className="text-display-sm text-balance">
        {storefrontText.pages["checkout"]}
      </h1>
    </main>
  );
}
