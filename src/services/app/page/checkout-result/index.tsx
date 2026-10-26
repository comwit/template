"use client";

import { storefrontText } from "@/lib/ui-text";

// 빈 깡통. 파생 프로젝트에서 섹션 파일로 나눠 채운다(page.ai.md). useSearchParams의 payment/order 쿼리로 결과를 판단하고 useOrders로 주문을 보여준다.
export default function CheckoutResult() {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-16">
      <h1 className="text-display-sm text-balance">
        {storefrontText.pages["checkout-result"]}
      </h1>
    </main>
  );
}
