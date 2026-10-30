"use client";

import type { ReactNode } from "react";
import { storefrontText } from "@/lib/ui-text";

export { NewArrivals } from "./new-arrivals";
export { NewArrivalsSkeleton } from "./skeleton";

// 빈 깡통. 파생 프로젝트에서 섹션 파일로 나눠 채운다(page.ai.md).
// 셸: 제목·섹션 제목처럼 데이터가 없는 부분. 데이터 섹션(NewArrivals)은 라우트가 Suspense 경계으로 넘기고
// 그 안에서 useCatalog 목록을 `.suspend()` 로 SSR 한다. 섹션을 더할 때도 섹션마다 같은 모양의 뼈대를 둔다.
export default function Home({ newArrivals }: { newArrivals: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-16">
      <h1 className="text-display-sm text-balance">
        {storefrontText.pages["home"]}
      </h1>
      <section className="mt-12">
        <h2 className="text-title-lg">{storefrontText.newArrivals}</h2>
        {newArrivals}
      </section>
    </main>
  );
}
