"use client";

import type { ReactNode } from "react";
import { siteText } from "@/lib/ui-text";

export { CourseList } from "./course-list";
export { CourseListSkeleton } from "./skeleton";

// 빈 깡통. 파생 프로젝트에서 섹션 파일로 나눠 채운다(page.ai.md).
// 화면 셸: 제목·안내 문구처럼 데이터가 없는 부분만 둔다. 이 부분은 정적 셸(App Shell)에 들어가 바로 뜬다.
// 데이터가 들어가는 필터·목록은 라우트가 `children` 으로 넘기는 Suspense 경계(CourseList) 안에 있다
// (`src/app/(app)/courses/page.tsx`). 경계의 fallback 은 실제 목록과 같은 모양의 CourseListSkeleton 이다.
export default function Courses({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-16">
      <h1 className="text-display-sm text-balance">
        {siteText.pages["courses"]}
      </h1>
      {children}
    </main>
  );
}
