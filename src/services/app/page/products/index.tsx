"use client";

import { storefrontText } from "@/lib/ui-text";

// 빈 깡통. 파생 프로젝트에서 섹션 파일로 나눠 채운다(page.ai.md). useCatalog 목록을 .suspend({ page })로 SSR 하고 필터·정렬은 API 인자로 넘긴다.
export default function Products() {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-16">
      <h1 className="text-display-sm text-balance">
        {storefrontText.pages["products"]}
      </h1>
    </main>
  );
}
