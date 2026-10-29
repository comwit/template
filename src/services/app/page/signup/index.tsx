"use client";

import { siteText } from "@/lib/ui-text";

// 빈 깡통. 파생 프로젝트에서 섹션 파일로 나눠 채운다(page.ai.md). @/lib/auth-client/app으로 가입한다. 입력은 Form·TextField 컴포넌트를 쓴다.
export default function Signup() {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-16">
      <h1 className="text-display-sm text-balance">
        {siteText.pages["signup"]}
      </h1>
    </main>
  );
}
