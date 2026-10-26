"use client";

import { storefrontText } from "@/lib/ui-text";

// 빈 깡통. 파생 프로젝트에서 섹션 파일로 나눠 채운다(page.ai.md). @/lib/auth-client/app으로 로그인하고 완료 후 useUser.actions로 세션을 갱신한다.
export default function Login() {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-16">
      <h1 className="text-display-sm text-balance">
        {storefrontText.pages["login"]}
      </h1>
    </main>
  );
}
