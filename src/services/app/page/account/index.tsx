"use client";

import { storefrontText } from "@/lib/ui-text";

// 빈 깡통. 파생 프로젝트에서 섹션 파일로 나눠 채운다(page.ai.md). useUser의 me는 레이아웃 셸이 suspend로 받은 값을 읽기만 한다(선택자에서 load 호출 금지).
export default function Account() {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-16">
      <h1 className="text-display-sm text-balance">
        {storefrontText.pages["account"]}
      </h1>
    </main>
  );
}
