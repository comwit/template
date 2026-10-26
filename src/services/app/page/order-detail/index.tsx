"use client";

import { storefrontText } from "@/lib/ui-text";

// 빈 깡통. 파생 프로젝트에서 섹션 파일로 나눠 채운다(page.ai.md). useOrders 상세를 읽는다.
export default function OrderDetail({ orderId }: { orderId: string }) {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-16">
      <h1 className="text-display-sm text-balance">
        {storefrontText.pages["order-detail"]}
      </h1>
      <p className="mt-2 font-mono text-body-sm text-muted-foreground">
        {orderId}
      </p>
    </main>
  );
}
