"use client";

import type { ReactNode } from "react";
import { storefrontText } from "@/lib/ui-text";

export { ProductList } from "./product-list";
export { ProductListSkeleton } from "./skeleton";

// 빈 깡통. 파생 프로젝트에서 섹션 파일로 나눠 채운다(page.ai.md).
// 화면 셸: 제목·안내 문구처럼 데이터가 없는 부분만 둔다. 이 부분은 정적 셸(App Shell)에 들어가 바로 뜬다.
// 데이터가 들어가는 목록은 라우트가 `children` 으로 넘기는 Suspense 구멍(ProductList) 안에 있다
// (`src/app/(app)/products/page.tsx`). 구멍의 fallback 은 실제 목록과 같은 모양의 ProductListSkeleton 이다.
export default function Products({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-16">
      <h1 className="text-display-sm text-balance">
        {storefrontText.pages["products"]}
      </h1>
      {children}
    </main>
  );
}
